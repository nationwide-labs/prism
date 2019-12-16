import { EventEmitter } from "events";
import { Logger } from "../../Logger";
const request = require('request');

class WebAPIConfig {
    server: string;
    username: string;
    password: string;
    scheme?: string;
    endpoint?: string;
}
export class WebAPI extends EventEmitter {
    private authToken: any;
    private userId: any;
    private scheme: string;
    private server: string;
    private username: string;
    private password: string;
    private endpoint: string;

    constructor(config: WebAPIConfig) {
        super();

        this.scheme = config.scheme || "https";
        this.endpoint = config.endpoint || "/api/v1/";
        this.server = config.server;
        this.username = config.username;
        this.password = config.password;

        if (!config.server) { throw new Error("Missing option 'server' in WebAPI"); }
        if (!config.username) { throw new Error("Missing option 'username' in WebAPI"); }
        if (!config.password) { throw new Error("Missing option 'password' in WebAPI"); }
    }

    async login() {
        await this.req({
            method: "POST",
            uri: `${this.scheme}://${this.server}${this.endpoint}login`,
            body: {
                username: this.username,
                password: this.password
            },
            json: true
        }).then((body) => {
            const data = body.data;
            this.authToken = data.authToken;
            this.userId = data.userId;
        }).catch((err) => {
            Logger.error(err);
        });
    }

    async request(verb: any, method: any, params: any, attempts: any): Promise<any> {
        attempts = attempts || 0;

        let requestData: any = {
            method: verb,
            uri: `${this.scheme}://${this.server}${this.endpoint}${method}`,
            json: true,
            headers: {
                "X-Auth-Token": this.authToken,
                "X-User-Id": this.userId
            }
        };

        if (params) {
            if (verb.toLowerCase() === "get") {
                requestData.qs = params;
            } else {
                requestData.body = params;
            }
        }
        return await this.req(requestData).catch(async (err) => {
            if (err.statusCode === 401) {
                if (attempts >= 3) {
                    throw new Error("Could not auth to WebAPI after 3 attempts");
                }

                await this.login();
                return await this.request(verb, method, params, ++attempts);
            }
            throw err;
        });
    }

    req(requestObject: any): any {
        return new Promise((resolve, reject) => {
            request(requestObject, (error, res, body) => {
                if (error) {
                    return reject(error);
                }
                if (res.statusCode !== 200) {
                    return reject(res);
                }

                return resolve(body);
            });
        });
    }
}
