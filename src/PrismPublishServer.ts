import { Logger } from "./Logger";
import * as AdmZip from 'adm-zip';
import * as express from 'express';
import * as http from 'http';
import * as bodyParser from 'body-parser';
import { EventEmitter } from 'events';
const fsExtra = require('fs-extra');
const os = require("os");

class PrismPublishServerConfig {
    port: string;
    key: string;
    secret: string;
    app?: any;
    server?: any;
    cwd: string;
}

export class PrismPublishServer extends EventEmitter {
    private config: PrismPublishServerConfig;

    constructor(config: PrismPublishServerConfig) {
        super();
        this.config = config;
        if (!config.port) {
            config.port = '8080';
        }
        this.setup();
    }

    wait(ms) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                return resolve();
            }, ms);
        });
    }

    setup() {
        if (!(this.config.app && this.config.server)) {
            this.config.app = express();
            this.config.server = http.createServer(this.config.app);

            try {
                this.config.server.listen(this.config.port, () => {
                    Logger.success(`Publish Server running on port ${this.config.server.address().port}`);
                });
            } catch (err) {
                Logger.error(err);
            }

            this.config.app.use(bodyParser.urlencoded({
                extended: false,
                limit: '100mb'
            }));

            this.config.app.use(bodyParser.json({
                limit: '100mb'
            }));
        }

        this.config.app.use((req, res, next) => {
            res.set('X-Frame-Options', 'DENY');
            next();
        });

        this.config.app.post('/ping', (req, res) => {
            if (!this.isAuth(req)) {
                Logger.error('Ping Denied.');
                return res.status(401).json({
                    message: 'Access Denied',
                    success: false
                });
            }

            Logger.log('Ping Success.');
            return res.json({
                message: 'Success',
                success: true
            });
        });

        this.config.app.post('/publish', async (req, res) => {
            Logger.log('Publish Called');

            if (!this.isAuth(req)) {
                Logger.error('Publish Denied.');
                return res.status(401).json({
                    message: 'Access Denied',
                    success: false
                });
            }

            if (req.body.zip) {
                this.emit('shutdown');

                await this.wait(100).catch(() => { });

                Logger.log('Unzipping Deployment');
                try {

                    fsExtra.emptyDirSync(this.config.cwd);

                    await this.wait(100).catch(() => { });

                    let zip = new AdmZip(Buffer.from(req.body.zip, 'base64'));
                    try {
                        zip.extractAllTo(this.config.cwd, true);

                        res.json({
                            message: 'Published',
                            success: true
                        });

                        this.wait(100).then(() => {
                            this.emit('start');
                        }).catch(() => { });
                        return;
                    } catch (err) { }

                    return res.json({
                        message: 'Could not publish',
                        success: false
                    });
                } catch (err) {
                    Logger.error(err);
                }

                return;
            }

            return res.json({
                message: 'Unknown',
                success: false
            });
        });
    }

    isAuth(req) {
        if (!(this.config.key && this.config.secret)) {
            return true;
        }

        try {
            let base64Credentials = (req.headers.authorization).split(' ')[1];
            const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
            const [key, secret] = credentials.split(':');
            if (!(this.config.key && this.config.secret && key && secret)) {
                return true;
            }
            return key === this.config.key && secret === this.config.secret;
        } catch (err) {
            console.log(err);
        }
        return false;
    }
}
