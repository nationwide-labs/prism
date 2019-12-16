import { Logger } from "./Logger";
import * as vm from 'vm';
import * as  handlebars from 'handlebars';
import * as fs from 'fs-extra';
import * as builder from 'botbuilder';
import * as path from 'path';
import * as _ from 'lodash';
import * as nodemailer from 'nodemailer';
import * as request from 'request';

export class PrismUtil {
    static transporter = nodemailer.createTransport({
        host: process.env.MAIL_HOST,
        port: 25
    });

    static ensurePath(filePath: string) {
        filePath = filePath || '';

        let sep = path.sep;
        let initDir = path.isAbsolute(filePath) ? sep : '';

        filePath.split(sep).reduce((parentDir, childDir) => {
            const curDir = path.resolve(parentDir, childDir);
            if (!fs.existsSync(curDir)) {
                Logger.info('Creating: ' + curDir);
                fs.mkdirSync(curDir);
                Logger.info('Created: ' + curDir);
            }
            return curDir;
        }, initDir);
    }

    static fileExists(file: string) {
        try {
            if (fs.existsSync(file)) {
                return true;
            }
        } catch (err) { }
        return false;
    }

    static loadJSON(file: string) {
        return new Promise((resolve, reject) => {
            try {
                return resolve(JSON.parse(fs.readFileSync(file, 'utf-8')));
            } catch (error) {
                Logger.error(error.message);
            }
            return reject();
        });
    }

    static readJSON(file: string) {
        try {
            return JSON.parse(fs.readFileSync(file, 'utf-8'));
        } catch (error) {
            Logger.error(error.message);
        }
    }

    static readFile(file: string) {
        try {
            return fs.readFileSync(file, 'utf-8');
        } catch (error) {
            Logger.error(error.message);
        }
    }

    static loadFile(file: string) {
        return new Promise((resolve, reject) => {
            try {
                return resolve(fs.readFileSync(file, 'utf-8'));
            } catch (error) {
                Logger.error(error.message);
            }
            return reject();
        });
    }

    static timeToWrite(text: string) {
        if (!text) {
            return 0;
        }
        // 200 words per minute... 1000 characters a minute
        let time = (text.length / 1000) * 60 * 1000;
        if (time < 500) {
            time = 500;
        }
        if (time > 5000) {
            time = 5000;
        }
        return time;
    }

    static wait(session: any, time: number) {
        return new Promise(async (resolve, reject) => {
            let typingTime = 2500;
            let times = Math.floor(time / typingTime);
            for (let i = 0; i < times; i++) {
                session.sendTyping();
                await PrismUtil.actual_wait(typingTime);
            }
            let leftOver = time - (typingTime * times);
            if (leftOver >= 500) {
                session.sendTyping();
            }
            await PrismUtil.actual_wait(leftOver);
            return resolve();
        });
    }

    static promiseGet(config) {
        return new Promise((resolve, reject) => {
            let req = config.request || request;
            req(config, (error, response, body) => {
                if (error) {
                    return reject(config.raw ? {
                        error: error,
                        response: response,
                        body: body
                    } : error);
                }
                return resolve(config.raw ? {
                    error: error,
                    response: response,
                    body: body
                } : body);
            });
        });
    }

    static promisePost(config) {
        return new Promise((resolve, reject) => {
            let req = config.request || request;
            req.post(config, (error, response, body) => {
                if (error) {
                    return reject(config.raw ? {
                        error: error,
                        response: response,
                        body: body
                    } : error);
                }
                return resolve(config.raw ? {
                    error: error,
                    response: response,
                    body: body
                } : body);
            });
        });
    }

    static actual_wait(time: number) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                return resolve();
            }, time);
        });
    }

    static templateText(message: any, sandbox: any) {
        let result: any = message || '';

        if (!(typeof result === 'string' || result instanceof String)) {
            try {
                result = JSON.stringify(result, null, 4);
            } catch (err) {
                result = 'There was an issue sending the message.';
                Logger.error(err);
            }
        } // guarantee it is a string...

        let data: any = {};

        data.process = {
            env: process.env
        };

        if (sandbox && sandbox.session) {
            data.variables = sandbox.session.userData;
        }

        let template: any;

        while (result.indexOf('{{') > -1 && result.indexOf('}}') > -1) {
            template = handlebars.compile(result);
            if (template) {
                result = template(data);
            }
        }

        if (result.length > 5000) {
            result = result.substring(0, 5000); // try preventing long messages
        }

        return result;
    }

    static runSessionScript(sand: any, code: any) {
        return new Promise(async (resolve, reject) => {

            let sandbox: any = _.defaults({
                /* Normal Context Items - Should I include global?? */
                Buffer: Buffer,
                clearImmediate: clearImmediate,
                clearInterval: clearInterval,
                clearTimeout: clearTimeout,
                setImmediate: setImmediate,
                setInterval: setInterval,
                setTimeout: setTimeout,

                /* Node */
                exports: exports,
                require: require,
                module: module,
                __filename: __filename,
                __dirname: __dirname,
                process: process,
                console: console,
                builder: builder,
                promiseGet: this.promiseGet,
                promisePost: this.promisePost,
                getResponse: () => {
                    if (sandbox.session) {
                        return sandbox.session.privateConversationData['prism-response'];
                    }
                },
                userData: sand.session ? sand.session.userData : undefined,
                conversationData: sand.session ? sand.session.conversationData : undefined,
                privateConversationData: sand.session ? sand.session.privateConversationData : undefined,
                setVariable: (name: string, value: any) => {
                    if (!(sandbox.session && name && name.indexOf('prism-') === -1)) {
                        return;
                    }
                    sandbox.session.privateConversationData[name] = value;
                    if (value === undefined) {
                        delete sandbox.session.privateConversationData[name];
                    }
                },
                setUserVariable: (name: string, value: any) => {
                    if (!(sandbox.session && name && name.indexOf('prism-') === -1)) {
                        return;
                    }
                    sandbox.session.userData[name] = value;
                    if (value === undefined) {
                        delete sandbox.session.userData[name];
                    }
                },
                setConversationVariable: (name: string, value: any) => {
                    if (!(sandbox.session && name && name.indexOf('prism-') === -1)) {
                        return;
                    }
                    sandbox.session.conversationData[name] = value;
                    if (value === undefined) {
                        delete sandbox.session.conversationData[name];
                    }
                },
                getVariable: (name: string) => {
                    if (sandbox.session) {
                        let cloned = JSON.parse(JSON.stringify(sandbox.session.privateConversationData));
                        return cloned[name];
                    }
                },
                getUserVariable: (name: string) => {
                    if (sandbox.session) {
                        let cloned = JSON.parse(JSON.stringify(sandbox.session.userData));
                        return cloned[name];
                    }
                },
                getConversationVariable: (name: string) => {
                    if (sandbox.session) {
                        let cloned = JSON.parse(JSON.stringify(sandbox.session.conversationData));
                        return cloned[name];
                    }
                },
                getEntity: (name: string) => {
                    if (!sandbox.session) {
                        return;
                    }
                    let entity = sandbox.session.privateConversationData.entities[name];
                    if (!entity) {
                        return undefined;
                    }
                    return entity.entity;
                },
                resolve: (stateName: string) => {
                    if (sandbox.closed) {
                        Logger.info('-- Start --');
                        Logger.details('Resolve was called after node already moved on.');
                        Logger.log(sand.info);
                        Logger.info('-- End --');
                        return;
                    }
                    sandbox.closed = true;
                    sandbox['prism-state-name'] = stateName;
                    sandbox['prism-done'] = true;
                    sandbox['resolved'] = true;
                    return resolve(sandbox);
                },
                reject: () => {
                    if (sandbox.closed) {
                        Logger.info('-- Start --');
                        Logger.details('Reject was called after node already moved on.');
                        Logger.log(sand.info);
                        Logger.info('-- End --');
                        return;
                    }
                    sandbox.closed = true;
                    sandbox['prism-exit'] = true;
                    sandbox['rejected'] = true;
                    return resolve(sandbox);
                },
                vmError: (err) => {
                    Logger.info('-- Start Code Error --');
                    Logger.log(sand.info);
                    Logger.error(err);
                    Logger.info('-- End Code Error --');
                    return reject(err);
                },
                user: undefined,
                email: PrismUtil.email,
                send: (message: string) => {
                    return new Promise(async (resolveSub, rejectSub) => {
                        if (!sandbox.session) {
                            return rejectSub('missing session');
                        }

                        let text = PrismUtil.templateText(message, sandbox);
                        if (sandbox.speakSlow) {
                            let milliseconds = PrismUtil.timeToWrite(text);
                            await PrismUtil.wait(sandbox.session, milliseconds);
                        }
                        sandbox.session.send(text);
                        return resolveSub();
                    });
                }
            }, sand);

            if (sand.session && sand.session.message && sand.session.message.address) {
                sandbox.user = sand.session.message.address.user.ad || sand.session.message.address.user;
            }

            sandbox.closed = false;

            try {
                let opts = {
                    lineOffset: 0,
                    displayErrors: true
                };
                vm.runInNewContext(`(async()=>{
                    ${code}
                })().catch((x)=>{ vmError(x); });`, sandbox, opts);
            } catch (err) {
                sandbox.vmError(err);
                return reject(err);
            }
        });
    }

    static setMailTransport(transporter) {
        this.transporter = transporter;
    }

    static email(config: any) {
        return new Promise((resolve, reject) => {
            this.transporter.sendMail(config, (error, info) => {
                if (error) {
                    return reject(error);
                }
                return resolve(info);
            });
        });
    }

    static runScript(sand: any, code: any) {
        return new Promise(async (resolve, reject) => {
            let sandbox: any = _.defaults({
                /* Normal Context Items - Should I include global?? */
                Buffer: Buffer,
                clearImmediate: clearImmediate,
                clearInterval: clearInterval,
                clearTimeout: clearTimeout,
                setImmediate: setImmediate,
                setInterval: setInterval,
                setTimeout: setTimeout,
                process: process,
                console: console,
                email: PrismUtil.email,

                /* Node */
                exports: exports,
                require: require,
                module: module,
                __filename: __filename,
                __dirname: __dirname,

                builder: builder,
                promiseGet: this.promiseGet,
                promisePost: this.promisePost,
                vmError: (err) => {
                    Logger.info('-- Start Code Error --');
                    Logger.log(sand.info);
                    Logger.error(err);
                    Logger.info('-- End Code Error --');
                }
            }, sand);
            try {
                let opts = {
                    lineOffset: 0,
                    displayErrors: true
                };
                vm.runInNewContext(`(async()=>{
                    ${code}
                })().catch((x)=>{ vmError(x); });`, sandbox, opts);
                return resolve();
            } catch (err) {
                sandbox.vmError(err);
                return reject(err);
            }
        });
    }
}
