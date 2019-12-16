import { Logger } from "./Logger";
import { EventLogger } from "./EventLogger";
import * as request from 'request';
import { PrismBot } from "./PrismBot";

class PrismAnalyticsConfig {
    username: string;
    password: string;
    server: string;
    messages: boolean;
    utterances: boolean;
    prismBot: PrismBot;
}

export class PrismAnalytics {
    private config: PrismAnalyticsConfig;

    constructor(config: PrismAnalyticsConfig) {
        this.config = config;

        let eventLogger = EventLogger.get();

        eventLogger.on('userSaid', this.userSaid.bind(this));
        eventLogger.on('botSaid', this.botSaid.bind(this));
        eventLogger.on('commandHit', this.commandHit.bind(this));
        eventLogger.on('taskHit', this.taskHit.bind(this));
        eventLogger.on('intentHit', this.intentHit.bind(this));
        eventLogger.on('utteranceHit', this.utteranceHit.bind(this));
        eventLogger.on('nodeHit', this.nodeHit.bind(this));
    }

    post(url, body) {
        return new Promise((resolve, reject) => {
            request.post({
                url: this.config.server + url,
                body: body,
                json: true,
                headers: {
                    Authorization: "Basic " + Buffer.from(this.config.username + ":" + this.config.password).toString("base64")
                }
            }, (err, resp, responseBody) => {
                if (err || !responseBody || !resp) {
                    return reject(err);
                }
                if (resp.statusCode !== 200) {
                    return reject('ERROR');
                }
                return resolve(responseBody);
            });
        });
    }

    sync() {
        return new Promise((resolve, reject) => {
            this.syncBot().then(() => {
                return resolve();
            }).catch(() => {
                let syncInterval = setInterval(async () => {
                    this.syncBot().then(() => {
                        clearInterval(syncInterval);
                        return resolve();
                    }).catch(() => { });
                }, 5000);
            });
        });
    }

    syncBot() {
        return new Promise(async (resolve, reject) => {
            let bot = this.config.prismBot;

            let trackedTasks: any[] = [];
            let trackedCommands: any[] = [];
            let trackedIntents: any[] = [];

            let tasks = await bot.getTasks().catch(() => { }) || [];
            for (let i = 0; i < tasks.length; i++) {
                if (tasks[i].isEnabled && tasks[i].name) {
                    trackedTasks.push({
                        id: tasks[i].id,
                        name: tasks[i].name
                    });
                }
            }

            let commands = await bot.getCommands().catch(() => { }) || [];
            for (let i = 0; i < commands.length; i++) {
                if (commands[i].isEnabled && commands[i].name) {
                    trackedCommands.push({
                        id: commands[i].id,
                        name: commands[i].name
                    });
                }
            }

            let intents = await bot.getIntents().catch(() => { }) || [];
            for (let i = 0; i < intents.length; i++) {
                if (intents[i].isEnabled && intents[i].name) {
                    trackedIntents.push({
                        id: intents[i].id,
                        name: intents[i].name
                    });
                }
            }

            Logger.info('Prism Analytics Sync Attempt');

            this.post('/api/logging/sync', {
                intents: trackedIntents,
                commands: trackedCommands,
                tasks: trackedTasks
            }).then(() => {
                Logger.info('Prism Analytics Sync Success');
                return resolve(true);
            }).catch((err) => {
                console.log(err);
                Logger.error('Prism Analytics Sync Error');
                return reject();
            });
        });
    }

    utteranceHit(body: any) {
        if (this.config.utterances) {
            this.post('/api/logging/utterance', {
                userId: body.userId,
                source: body.source,
                utterance: body.utterance,
                intent: body.intent,
                intentId: body.intentId,
                score: body.score,
                args: body.args
            }).catch(() => { });
        }
    }

    intentHit(body: any) {
        this.post('/api/logging/intent', {
            id: body.intentId,
            userId: body.userId,
            source: body.source
        }).catch(() => { });
    }

    nodeHit(body: any) {
        this.post('/api/logging/node', {
            id: body.nodeId,
            intentId: body.intentId,
            userId: body.userId,
            source: body.source
        }).catch(() => { });
    }

    commandHit(body: any) {
        this.post('/api/logging/command', {
            id: body.commandId,
            userId: body.userId,
            source: body.source,
            raw: body.raw
        }).catch(() => { });
    }

    taskHit(body: any) {
        this.post('/api/logging/task', {
            id: body.taskId
        }).catch(() => { });
    }

    botSaid(body: any) {
        this.post('/api/logging/message ', {
            userId: body.userId,
            source: body.source,
            text: this.config.messages ? body.text : undefined,
            conversationId: body.conversationId,
            isSelf: true
        }).catch(() => { });
    }

    userSaid(body: any) {
        this.post('/api/logging/message', {
            userId: body.userId,
            source: body.source,
            text: this.config.messages ? body.text : undefined,
            conversationId: body.conversationId,
            isSelf: false
        }).catch(() => { });
    }
}
