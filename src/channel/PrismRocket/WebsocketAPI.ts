import { Logger } from "./../../Logger";
import { EventEmitter } from "events";
import { v4 as uuid } from "uuid";
const ReconnectingWebSocket = require('reconnecting-websocket');
const WebSocket = require('ws');

class WebsocketAPIConfig {
    server: string;
    username: string;
    password: string;
    scheme?: string;
    endpoint?: string;
}

export class WebsocketAPI extends EventEmitter {
    private ws: any;
    private server: any;
    private username: any;
    private password: any;
    private scheme: any;
    private endpoint: any;
    private promises: any = {};

    constructor(config: WebsocketAPIConfig) {
        super();

        this.scheme = config.scheme || 'wss';
        this.endpoint = config.endpoint || '/websocket';
        this.server = config.server;
        this.username = config.username;
        this.password = config.password;

        if (!this.server) { throw new Error("Missing option 'server' in WebsocketAPI"); }
        if (!this.username) { throw new Error("Missing option 'username' in WebsocketAPI"); }
        if (!this.password) { throw new Error("Missing option 'password' in WebsocketAPI"); }
    }

    async connect() {
        this.emit("beforeConnect");

        this.ws = new ReconnectingWebSocket(`${this.scheme}://${this.server}${this.endpoint}`, [], {
            WebSocket: WebSocket,
            connectionTimeout: 5000
        });

        this.ws.addEventListener('open', () => {
            this.emit("opened");
            this.request({
                msg: "connect",
                version: "1",
                support: ["1"]
            }).catch(() => { });
        });

        this.ws.addEventListener('error', (error) => {
            Logger.error(error);
            this.emit(error);
        });

        this.ws.addEventListener('close', (close) => {
            Logger.error(close);
            this.emit(close);
        });

        this.ws.addEventListener('message', this.onMessageHandler.bind(this));
    }

    request(obj: any) {
        return new Promise((resolve, reject) => {
            try {
                obj.id = uuid();

                this.promises[obj.id] = {
                    resolve: resolve,
                    reject: reject
                };

                this.ws.send(JSON.stringify(obj));
            } catch (err) {
                Logger.error(err);
                this.promises[obj.id].reject(err);
                delete this.promises[obj.id];
            }
        });
    }

    async login() {
        await this.method("login", [{
            user: {
                username: this.username
            },
            password: this.password
        }]).then((x) => {
            this.emit("loggedIn");
        }).catch((err) => {
            Logger.error(err);
        });
    }

    onMessageHandler(event: any) {
        try {
            let data = event.data;
            let msg = JSON.parse(data);

            if (msg && msg.id && this.promises[msg.id]) {
                this.promises[msg.id].resolve(msg);
            }

            switch (msg.msg) {
                case "connected":
                    this.emit("connected");
                    this.login();
                    break;
                case "ping":
                    this.pong();
                    break;
                case "changed":
                    this.onChangedEvent(msg);
                    break;
                default:
                    break;
            }
        } catch (err) {
            Logger.error(err);
        }
    }

    onChangedEvent(msg: any) {
        switch (msg.collection) {
            case "stream-notify-user":
                if (msg.fields.eventName.endsWith('/rooms-changed')) {
                    this.emit("roomMessage", msg.fields.args[1]);
                }
                break;
        }
    }

    pong() {
        return this.request({
            msg: "pong"
        });
    }

    method(method: any, params: any) {
        return this.request({
            msg: "method",
            method,
            params
        });
    }

    sub(name: any, params: any) {
        return this.request({
            msg: "sub",
            name,
            params
        });
    }

    sendChatMessage(rid: any, msg: any) {
        return this.method("sendMessage", [{
            _id: uuid(),
            rid,
            msg
        }]);
    }

    sendChatTyping(rid: any, value: boolean) {
        return this.method("stream-notify-room", [
            rid + '/typing',
            this.username,
            value
        ]);
    }
}
