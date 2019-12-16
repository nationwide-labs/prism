import { IChannel } from "../IChannel";
import { WebAPI } from "./WebAPI";
import { WebsocketAPI } from "./WebsocketAPI";
import { Logger } from "./../../Logger";

class PrismRocketConfig {
    server: string;
    username: string;
    password: string;
}

export class PrismRocket extends IChannel {
    private webAPI: WebAPI;
    private wsAPI: WebsocketAPI;
    private ts: Date;
    private server: string;
    private username: string;
    private password: string;

    constructor(config: PrismRocketConfig) {
        super('rocket');

        this.server = config.server;
        this.username = config.username;
        this.password = config.password;

        this.ts = new Date();

        if (!this.server) { throw new Error("Missing option 'server' in rocket/bot.js"); }
        if (!this.username) { throw new Error("Missing option 'username' in rocket/bot.js"); }
        if (!this.password) { throw new Error("Missing option 'password' in rocket/bot.js"); }

        this.webAPI = new WebAPI({
            server: this.server,
            username: this.username,
            password: this.password
        });

        this.wsAPI = new WebsocketAPI({
            server: this.server,
            username: this.username,
            password: this.password
        });

        setTimeout(() => {
            this.wsAPI.connect();
        }, 1000);

        this.wsAPI.on("loggedIn", this.onLoggedIn.bind(this));
        this.wsAPI.on("roomMessage", this.onRoomMessage.bind(this));
    }

    send(message: any): Promise<any> {
        if (message.type === 'message') {
            if (message.text) {
                this.wsAPI.sendChatTyping(message.address.conversation.id, false);
                return this.wsAPI.sendChatMessage(message.address.conversation.id, message.text);
            }
        } else if (message.type === 'typing') {
            return this.wsAPI.sendChatTyping(message.address.conversation.id, true);
        }
        return new Promise((res, rej) => {
            return rej();
        });
    }

    async onLoggedIn() {
        Logger.success('Rocket Chat Logged In');
        await this.webAPI.request("GET", "me", undefined, undefined).then((me) => {
            // should this be true or false??
            // https://rocket.chat/docs/developer-guides/realtime-api/subscriptions/
            this.wsAPI.sub("stream-notify-user", [me._id + '/rooms-changed', true]).catch((err: any) => {
                Logger.error(err);
            });
        }).catch((err) => {
            Logger.error(err);
        });
    }

    async onRoomMessage(roomMessage: any) {
        let session = roomMessage.lastMessage;

        if (!session) {
            // nothing to process
            return;
        }

        session.isRocket = true;
        session.isConsole = false;

        if (session.u.username === this.username) {
            // maybe we shouldn't process our own messages?? toggleable??
            return;
        }

        let d = new Date(session.ts.$date);

        if (this.ts.getTime() > d.getTime()) {
            // the message was created before the bot started
            // or maybe a message was deleted, lets not process it again
            return;
        }

        this.ts = d;

        let isTagged = false;
        if (session.msg.startsWith('@' + this.username + ' ') || session.msg.startsWith(this.username + ' ')) {
            let content = session.msg.split(' ');
            content.shift();
            session.msg = content.join(' ');
            isTagged = true;
        }

        // d: direct chat
        // c: public group chat
        // p: private group chat

        this.emit('message', {
            type: 'message',
            agent: 'user',
            isTagged: isTagged,
            source: this.channelId,
            timestamp: d,
            text: roomMessage.lastMessage.msg,
            channelData: {
                clientActivityID: roomMessage._id
            },
            attachments: [],
            entities: [],
            address: {
                channelId: this.channelId,
                user: {
                    id: roomMessage.lastMessage.u.username,
                    raw: roomMessage.lastMessage.u
                },
                conversation: {
                    id: roomMessage.lastMessage.rid,
                    isGroup: roomMessage.t !== 'd'
                }
            }
        });
    }
}
