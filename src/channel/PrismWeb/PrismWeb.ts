import { IChannel } from "../IChannel";
import { Logger } from "../../Logger";
import { v4 as uuid } from 'uuid';
import * as WebSocket from 'ws';

const RECONNECT_INTERVAL = 5000;

class PrismWebConfig {
    server: string;
    username: string;
    password: string;
    debugging?: any;
}

export class PrismWeb extends IChannel {
    private promises: any = {};
    private client: any;
    private server: string;
    private username: string;
    private password: string;

    constructor(config: PrismWebConfig) {
        super('prism-chat');

        this.server = config.server;
        this.username = config.username;
        this.password = config.password;

        this.connect();

        setInterval(() => {
            this.stack({
                event: 'ping',
                data: {}
            }).catch(() => {
                Logger.error('Ping failed...');
            });
        }, 55 * 1000);
    }

    debug(text: any) {
        Logger.debug(`Prism Web: ${text}`);
    }

    onConnected = () => {
        Logger.log('Connection Opened');
    }

    onDisconnected = (error: any) => {
        Logger.error('Connection Closed');
    }

    onError = (error: any) => {
        Logger.error('Connection Error');
    }

    stack(body: any) {
        let self = this;
        return new Promise((resolve, reject) => {
            try {
                if (!body) {
                    return reject();
                }
                body.requestId = uuid.v4();

                self.promises[body.requestId] = {
                    rs: resolve,
                    rj: reject
                };
                self.client.send(JSON.stringify(body));
            } catch (err) {
                Logger.error(err);
                return reject(err);
            }
        });
    }

    connect = () => {
        Logger.log('Connecting');
        let client = new WebSocket(this.server + '/ws/api/bot', {
            headers: {
                client_id: this.username,
                client_secret: this.password
            }
        });

        this.client = client;

        client.onerror = (e: any) => {
            if (this.onError) {
                this.onError(e);
            }
        };

        client.onopen = () => {
            if (this.onConnected) {
                this.onConnected();
            }
        };

        client.onclose = (e: any) => {
            Logger.log('Closed');

            if (this.onDisconnected) {
                this.onDisconnected(e);
            }

            setTimeout(() => {
                this.connect();
            }, RECONNECT_INTERVAL);
        };

        client.onmessage = (e: any) => {
            try {
                let data = JSON.parse(e.data);
                if (data.action === 'message') {
                    let message = data.data;
                    this.prepIncomingMessage(message);
                    this.emit('message', message);
                } else if (data.responseId) {
                    if (this.promises[data.responseId]) {
                        if (data.success === true) {
                            this.promises[data.responseId].rs(data.data);
                        } else {
                            this.promises[data.responseId].rj(data.message);
                        }
                        delete this.promises[data.responseId];
                    }
                } else {
                    this.debug(data);
                }
            } catch (err) {
                Logger.error(err);
            }
        };
    }

    prepIncomingMessage = (msg: any) => {
        msg.text = msg.text || '';
        msg.attachments = msg.attachments || [];
        msg.entities = msg.entities || [];
        msg.source = this.channelId;
        msg.address = {
            id: msg.id,
            channelId: this.channelId,
            user: msg.from,
            conversation: msg.conversation
        };
    }

    prepOutgoingMessage = (msg: any) => {
        if (msg.attachments) {
            let attachments: any = [];
            for (let i = 0; i < msg.attachments.length; i++) {
                let a = msg.attachments[i];
                switch (a.contentType) {
                    case 'application/vnd.microsoft.keyboard':
                        a.contentType = 'application/vnd.microsoft.card.hero';
                        attachments.push(a);
                        break;
                    default:
                        attachments.push(a);
                        break;
                }
            }
            msg.attachments = attachments;
        }
        delete msg.agent;
        delete msg.source;
        if (!msg.localTimestamp) {
            msg.localTimestamp = new Date().toISOString();
        }
        msg.recipient = msg.address.user;
    }

    startConversation = (address: any, done: any) => {
        Logger.info('start convo?');
        Logger.info(address);
    }

    send(message: any): Promise<any> {
        let self = this;
        return new Promise(async (resolve, reject) => {
            this.prepOutgoingMessage(message);
            await self.stack({
                event: 'message',
                data: message
            }).catch(() => { });

            return resolve();
        });
    }
}
