import { Logger } from "./../../Logger";
import * as multiparty from 'multiparty';
import * as Datauri from 'datauri';
import * as fs from 'fs';
import * as express from 'express';
import * as http from 'http';
import * as bodyParser from 'body-parser';
import * as  path from 'path';
import * as jwt from 'jsonwebtoken';
const expressWs = require('express-ws');
import { LocalWeb } from './LocalWeb';

class DirectLineConfig {
    localUserId?: string;
    localDisplayName?: string;
    port: string;
    web: LocalWeb;
    secret: string;
    stream: string;
    user?: any;
}

class MessageBody {
    conversationId: string;
    text?: string;
    textFormat?: string;
    channelData: {
        clientActivityID: string;
    };
    attachments?: any;
    user: any;
}

export class DirectLine {
    private config: DirectLineConfig;
    private wss: any;
    private lastStatus: string;

    constructor(config: DirectLineConfig) {
        this.config = config;
        this.setupApp();
    }

    setupApp() {
        let app = express();
        let server = http.createServer(app);
        let ews = expressWs(app, server);
        this.wss = ews.getWss();

        if (Logger.isDebug) {
            setInterval(() => {
                let stream = 0;
                let sync = 0;
                let other = 0;
                try {
                    this.wss.clients.forEach((client) => {
                        if (client.stream) {
                            stream++;
                        } else if (client.sync) {
                            sync++;
                        } else {
                            other++;
                        }
                    });

                    let status = `Stream: ${stream}, Sync: ${sync}, Other: ${other}`;

                    if (status !== this.lastStatus) {
                        this.lastStatus = status;
                        Logger.debug(status);
                    }
                } catch (err) { }
            }, 5000);
        }

        app.use((req, res, next) => {
            res.set('X-Frame-Options', 'DENY');
            next();
        });

        app.engine('html', require('ejs').renderFile);
        app.set('view engine', 'ejs');
        app.use('/', express.static(path.join(__dirname, "../../views")));
        app.set("views", path.join(__dirname, "../../views"));

        app.use('/node_modules', express.static(path.join(__dirname, '../../../node_modules')));
        app.use(bodyParser.urlencoded({
            extended: false,
            limit: '100mb'
        }));

        app.use(bodyParser.json({
            limit: '100mb'
        }));

        if (Logger.isDebug) {
            let num = 0;
            app.use(async (req, res, next) => {
                let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
                let method = req.method;
                let url = req.url;
                let protocol = req.protocol;
                console.log((++num) + ". [" + ip + "] " + method + " " + protocol + " " + url);
                next();
            });
        }

        server.listen(this.config.port, () => {
            Logger.success(`Local Web Server running on port ${this.config.port}`);
        });

        app.get('/', (req, res) => {
            let user = {
                id: this.config.localUserId,
                name: this.config.localDisplayName || this.config.localUserId
            };

            if (this.config.user) {
                user = this.config.user;
            }

            let token = jwt.sign({
                user: {
                    id: user.id,
                    name: user.name
                },
                conversationId: user.id
            }, this.config.secret);

            return res.render('chat-local.html', {
                botName: 'Local Bot',
                conversationId: user.id,
                token: token,
                syncUrl: this.config.stream + `/api/sync?t=${token}`
            });
        });

        // Open Conversation By ID
        app.get('/v3/directline/conversations/:id', async (req, res) => {
            let token = this.removeBearer(req.headers.authorization);
            let decoded: any = await this.decodeJWT(token).catch(() => { });
            if (!decoded) {
                return res.sendStatus(401);
            }

            return res.json({
                conversationId: decoded.conversationId,
                token: token,
                streamUrl: this.config.stream + `/v3/directline/conversations/${decoded.conversationId}/stream?t=${token}`
            });
        });

        // Post Activity To Conversation
        app.post('/v3/directline/conversations/:id/activities', async (req, res) => {
            let token = this.removeBearer(req.headers.authorization);
            let decoded: any = await this.decodeJWT(token).catch(() => { });
            if (!decoded) {
                return res.sendStatus(401);
            }

            this.createMessage({
                conversationId: decoded.conversationId,
                text: req.body.text,
                textFormat: req.body.textFormat,
                channelData: req.body.channelData,
                user: decoded.user
            });

            return res.json({
                id: req.body.channelData.clientActivityID
            });
        });

        // Upload File To Conversation
        app.post('/v3/directline/conversations/:id/upload', async (req, res) => {
            let token = this.removeBearer(req.headers.authorization);
            let decoded: any = await this.decodeJWT(token).catch(() => { });
            if (!decoded) {
                return res.sendStatus(401);
            }

            let file: any = await this.parseFile(req).catch(() => { });
            if (!file) {
                return res.sendStatus(401);
            }

            this.createMessage({
                user: decoded.user,
                conversationId: decoded.conversationId,
                attachments: [{
                    contentType: file.contentType,
                    contentUrl: file.contentUrl
                }],
                channelData: file.body.channelData
            });

            return res.json({
                id: file.body.channelData.clientActivityID
            });
        });

        // Open Socket To Conversation
        app['ws']('/v3/directline/conversations/:id/stream', async (ws, req, next) => {
            ws.stream = true;

            let web = this.config.web;
            let decoded: any = await this.decodeJWT(req.query.t).catch(() => { });
            if (!(decoded)) {
                return ws.close();
            }
            ws.conversationId = decoded.conversationId;

            let user = decoded.user;
            let message = {
                type: 'conversationUpdate',
                action: 'membersAdded',
                agent: 'user',
                source: web.channelId,
                timestamp: new Date(),
                address: {
                    channelId: web.channelId,
                    user: {
                        id: user.id,
                        name: user.name,
                        raw: user
                    },
                    conversation: {
                        id: ws.conversationId,
                        isGroup: false
                    }
                },
                membersAdded: [{
                    id: user.id,
                    name: user.name
                }]
            };

            if (this.config.user) {
                message.address.user = this.config.user;
            }

            this.config.web.emit('message', message);

            ws.interval = setInterval(async () => {
                try {
                    ws.ping(() => { });
                } catch (err) { }
            }, 30000);

            Logger.success('Browser Connected stream');

            ws.on('close', () => {
                Logger.success(' Browser Disconnected stream');

                if (ws.interval) {
                    clearInterval(ws.interval);
                }
            });
        });

        app['ws']('/api/sync', async (ws, req, next) => {
            ws.sync = true;

            let decoded: any = await this.decodeJWT(req.query.t).catch(() => { });
            if (!(decoded)) {
                return ws.close();
            }

            ws.interval = setInterval(() => {
                try {
                    ws.ping(() => { });
                } catch (err) { }
            }, 30000);

            Logger.success('Browser Connected sync');

            ws.on('close', () => {
                Logger.success('Browser Disconnected sync');

                if (ws.interval) {
                    clearInterval(ws.interval);
                }
            });
        });
    }

    removeBearer = (authorization) => {
        return authorization.split(' ')[1];
    }

    decodeJWT = (token) => {
        return new Promise((resolve, reject) => {
            try {
                return resolve(jwt.verify(token, this.config.secret));
            } catch (err) { }
            return reject();
        });
    }

    parseFile = (req) => {
        return new Promise((resolve, reject) => {
            let form = new multiparty.Form({
                maxFilesSize: 5000000
            });

            form.parse(req, async (err, fields, files) => {
                if (err) {
                    return reject(err);
                }
                let body = JSON.parse(fs.readFileSync(files.activity[0].path, 'utf8'));
                let datauri = new Datauri(files.file[0].path);

                return resolve({
                    contentType: datauri.mimetype,
                    contentUrl: datauri.content,
                    body: body
                });
            });
        });
    }

    send(conversationId: string, activity) {
        try {
            this.wss.clients.forEach((client) => {
                if (client.stream && client.conversationId === conversationId) {
                    try {
                        client.send(JSON.stringify({
                            watermark: 0,
                            activities: [activity]
                        }));
                    } catch (err) { }
                }
            });
        } catch (err) { }
    }

    createMessage = (body: MessageBody) => {
        if (!body.user) {
            return;
        }

        let web = this.config.web;
        let activity = {
            id: body.channelData.clientActivityID,
            channelData: {
                clientActivityID: body.channelData.clientActivityID
            },
            type: 'message',
            source: web.channelId,
            channelId: web.channelId,
            timestamp: new Date(),
            text: body.text,
            textFormat: body.textFormat,
            attachments: body.attachments,
            conversation: {
                id: body.conversationId,
                isGroup: false
            },
            from: {
                id: body.user.id,
                name: body.user.name,
                role: 'user'
            }
        };

        let message = {
            type: 'message',
            agent: 'user',
            source: web.channelId,
            timestamp: new Date(),
            text: body.text,
            channelData: body.channelData,
            attachments: body.attachments,
            address: {
                channelId: web.channelId,
                user: {
                    id: body.user.id,
                    name: body.user.name,
                    raw: body.user
                },
                conversation: {
                    id: body.conversationId,
                    isGroup: false
                }
            }
        };

        if (this.config.user) {
            message.address.user = this.config.user;
            message.address.user.raw = this.config.user;
        }

        this.send(body.conversationId, activity);
        this.config.web.emit('message', message);
    }
}
