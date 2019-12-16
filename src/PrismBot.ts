import { EventEmitter } from "events";
import { PrismIntent } from "./nodes/PrismIntent";
import { PrismUtil } from "./PrismUtil";
import { Logger } from "./Logger";
import { EventLogger } from "./EventLogger";
import { Bot } from "./models/Bot";
import { Command } from "./models/Command";
import { Task } from "./models/Task";
import { PrismRecognizer } from "./PrismRecognizer";
import * as fs from 'fs-extra';
import * as  path from 'path';
import * as commander from 'bot-commander';
import Module = require('module');
import { Intent } from "./models/Intent";
import { PrismTask } from "./nodes/PrismTask";
import { PrismCommand } from "./nodes/PrismCommand";

class PrismBotConfig {
    cwd: string;
}

class PrismBotSetupConfig {
    universalBot: any;
    intentDialog: any;
    recognizer: PrismRecognizer;
    connector: any;
}

export class PrismBot extends EventEmitter {
    public config: PrismBotConfig;
    private bot: Bot;
    private setupConfig: PrismBotSetupConfig;

    constructor(config: PrismBotConfig) {
        super();
        this.config = config;
    }

    async setup(config: PrismBotSetupConfig) {
        this.setupConfig = config;

        if (!config.universalBot) {
            Logger.error('Missing universal bot.');
            return process.exit(0);
        }

        if (!config.intentDialog) {
            Logger.error('Missing intent dialog.');
            return process.exit(0);
        }

        this.bot = await this.getBot().catch(() => { }) || undefined;

        if (this.bot.isCommandsEnabled) {
            if (!this.bot.isCommandsHelpEnabled) {
                commander.command('help').action((meta) => { });
            }
            commander.prefix(this.bot.commandPrefix || '');
            commander.setSend((session, message) => {
                try {
                    session.send(message);
                } catch (err) { }
            });

            let commands = await this.getCommands().catch(() => { }) || [];

            for (let i = 0; i < commands.length; i++) {
                if (commands[i].name && commands[i].isEnabled) {
                    PrismCommand.init({
                        command: commands[i],
                        cwd: this.config.cwd,
                        universalBot: config.universalBot,
                        intentDialog: config.intentDialog
                    });
                }
            }
        }

        if (this.bot.isTasksEnabled) {
            let tasks = await this.getTasks().catch(() => { }) || [];
            for (let i = 0; i < tasks.length; i++) {
                if (tasks[i].isEnabled && tasks[i].schedule) {
                    PrismTask.init({
                        task: tasks[i],
                        cwd: this.config.cwd,
                        intentDialog: config.intentDialog,
                        universalBot: config.universalBot
                    });
                }
            }
        }

        if (this.bot.isIntentsEnabled) {
            let intents = await this.getIntents().catch(() => { }) || [];
            for (let i = 0; i < intents.length; i++) {
                let intent = intents[i];
                if (intent.isEnabled) {
                    PrismIntent.init({
                        bot: this.bot,
                        intent: intent,
                        universalBot: config.universalBot,
                        intentDialog: config.intentDialog,
                        connector: config.connector,
                        cwd: this.config.cwd
                    });
                }
            }
        }

        this.overrideRequire();

        if (this.bot.isMainEnabled) {
            Logger.log('Running Main Code.');
            let codeFile = path.resolve(this.config.cwd, 'main.js');
            let code = PrismUtil.readFile(codeFile);
            if (code) {
                PrismUtil.runScript({
                    info: {
                        main: true,
                        name: 'main.js'
                    },
                    intentDialog: config.intentDialog,
                    universalBot: config.universalBot,
                    commander: commander,
                    cwd: this.config.cwd,
                    recognizer: config.recognizer ? config.recognizer.getRecognizer() : undefined
                }, code).catch((err) => {
                    Logger.error(`Main Failed`);
                });
            }
        }
        Logger.info('Bot Started');
    }

    async defaultAction(session: any, args: any, next: any) {
        if (!this.setupConfig) {
            return;
        }

        if (this.bot.isUtterancesEnabled) {
            session.privateConversationData.args = args;
            try {
                EventLogger.get().utteranceHit({
                    userId: session.message.address.user.id,
                    source: session.message.source,
                    utterance: args.utterance,
                    intent: args.intent,
                    score: args.score,
                    args: args
                });
            } catch (err) { }

            if (this.setupConfig.universalBot.dialogs['/prism-intent-' + this.bot.defaultIntentId]) {
                return session.replaceDialog('/prism-intent-' + this.bot.defaultIntentId, {});
            }

            let message = "I am not sure how to respond";
            let milliseconds = PrismUtil.timeToWrite(message);
            await PrismUtil.wait(session, milliseconds);
            session.send(message);
        }
        session.endDialog();
    }

    overrideRequire() {
        let parent = this;
        Module.prototype.require = new Proxy(Module.prototype.require, {
            apply(target, thisArg, args) {
                try {
                    let file = args[0];
                    let newDir = path.resolve(parent.config.cwd, file) + '.js';
                    if (fs.existsSync(newDir)) {
                        return require(newDir);
                    }
                } catch (err) { }
                return Reflect.apply(target, thisArg, args);
            }
        });
    }

    conversationUpdate(message) {
        if (!this.setupConfig) {
            return;
        }

        if (message.membersAdded) {
            message.membersAdded.forEach((identity: any) => {
                if (this.setupConfig.universalBot.dialogs['/prism-intent-' + this.bot.triggerOnJoinIntentId]) {
                    this.setupConfig.universalBot.beginDialog(message.address, '/prism-intent-' + this.bot.triggerOnJoinIntentId);
                }
            });
        } else if (message.membersRemoved) {
            message.membersRemoved.forEach((identity: any) => { });
        }
    }

    intercept(message) {
        return new Promise((resolve, reject) => {
            if (!this.setupConfig) {
                return reject();
            }

            if (this.bot.isInterceptorEnabled) {

                let codeFile = path.resolve(this.config.cwd, 'interceptor.js');

                if (!PrismUtil.fileExists(codeFile)) {
                    return reject();
                }

                let code = PrismUtil.readFile(codeFile);
                if (!code) {
                    return reject();
                }

                return this.setupConfig.universalBot.loadSession(message.address, (err, session) => {
                    session.message = message;
                    PrismUtil.runSessionScript({
                        info: {
                            intercept: true
                        },
                        session: session,
                        speakSlow: this.bot.speakSlow,
                        intentDialog: this.setupConfig.intentDialog,
                        universalBot: this.setupConfig.universalBot,
                        cwd: this.config.cwd
                    }, code).then((sandbox: any) => {
                        if (sandbox.resolved) {
                            return resolve();
                        }
                        return reject();
                    }).catch(() => {
                        return reject();
                    });
                });
            }
            return resolve();
        });
    }

    interceptCommand(message) {
        return new Promise((resolve, reject) => {
            if (!this.setupConfig) {
                return reject();
            }

            if (this.bot.isCommandsEnabled && message.text) {
                let line = message.text;

                if (!this.bot.commandPrefix || (this.bot.commandPrefix && line.startsWith(this.bot.commandPrefix))) {
                    if (commander.prefixes) {
                        let prefixFound = commander.prefixes.find((prefix) => line.startsWith(prefix));
                        if (prefixFound) {
                            line = line.substring(prefixFound.length);
                        }
                    }

                    if (!(line.toLowerCase() === 'help' && !this.bot.isCommandsHelpEnabled)) {

                        let argv = line.split(/(\".+?\")|(\'.+?\')|\s+/g).filter((a) => (a && a.length > 0));
                        let parsed = commander.parseOptions(commander.normalize(argv));

                        if (parsed.args.length) {
                            let name = parsed.args[0];
                            let command = commander.commands.find((cmd) => {
                                return cmd._name === name || cmd._alias === name;
                            });

                            if (command) {
                                this.setupConfig.universalBot.loadSession(message.address, (err, session) => {
                                    session.message = message;
                                    commander.parse(message.text, session);
                                });
                                return resolve();
                            }
                        }
                    }
                }
            }
            return reject();
        });
    }

    async getBot(): Promise<Bot> {
        let cwd = this.config.cwd;
        let data = await PrismUtil.loadJSON(`${cwd}/data.json`).catch(() => { });
        let bot = new Bot();
        Object.assign(bot, data);
        return bot;
    }

    async getTasks(): Promise<Task[]> {
        let cwd = this.config.cwd;
        let tasksFolder = path.resolve(cwd, 'tasks');
        let tasks: Task[] = [];
        let taskFolders = fs.readdirSync(tasksFolder);
        for (let i = 0; i < taskFolders.length; i++) {
            let folder = path.resolve(tasksFolder, taskFolders[i]);
            let data = PrismUtil.readJSON(path.resolve(folder, 'data.json'));
            if (data.schedule && data.isEnabled) {
                let task = new Task();
                Object.assign(task, data);
                task.folder = folder;
                tasks.push(task);
            }
        }
        return tasks;
    }

    async getCommands(): Promise<Command[]> {
        let cwd = this.config.cwd;
        let commandsFolder = path.resolve(cwd, 'commands');
        let commands: Command[] = [];
        let commandFolders = fs.readdirSync(commandsFolder);
        for (let i = 0; i < commandFolders.length; i++) {
            let folder = path.resolve(commandsFolder, commandFolders[i]);
            let data = PrismUtil.readJSON(path.resolve(folder, 'data.json'));
            if (data.name && data.isEnabled) {
                let command = new Command();
                Object.assign(command, data);
                command.normalize();
                command.folder = folder;
                commands.push(command);
            }
        }
        return commands;
    }

    async getIntents(): Promise<Intent[]> {
        let cwd = this.config.cwd;
        let intents: Intent[] = [];
        let intentsFolder = path.resolve(cwd, 'intents');
        let intentFolders = fs.readdirSync(intentsFolder);
        for (let i = 0; i < intentFolders.length; i++) {
            let folder = path.resolve(intentsFolder, intentFolders[i]);
            let data = PrismUtil.readJSON(path.resolve(folder, 'data.json'));
            let intent = new Intent();
            Object.assign(intent, data);
            intent.normalize();
            intent.folder = folder;
            intents.push(intent);
        }
        return intents;
    }
}
