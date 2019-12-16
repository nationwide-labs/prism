import { Logger } from "../Logger";
import { EventLogger } from "../EventLogger";
import { Command } from "../models/Command";
import * as commander from 'bot-commander';
import * as  path from 'path';
import { PrismUtil } from "../PrismUtil";

class PrismCommandConfig {
    command: Command;
    cwd: string;
    intentDialog: any;
    universalBot: any;
}

export class PrismCommand {
    static init(config: PrismCommandConfig) {
        let command = config.command;
        return new Promise((resolve, reject) => {

            try {
                let commanderCommand = commander.command(command.name, {
                    noHelp: !command.isHelpEnabled
                }).description(command.description || 'No Description');

                for (let i = 0; i < command.options.length; i++) {
                    let option = command.options[i];
                    if (option.flags) {
                        commanderCommand.option(option.flags, option.description || 'No Description', option.defaultValue || false);
                    }
                }

                commanderCommand.action((session, opts) => {
                    try {
                        Logger.info(`Running Command: ${command.name}`);

                        EventLogger.get().commandHit({
                            commandId: command.id,
                            source: session.message.source,
                            userId: session.message.address.user.id,
                            raw: session.message.text
                        });
                    } catch (err) { }

                    let codeFile = path.resolve(command.folder,
                        (config.command.codeFile || 'code.js')
                    );

                    if (!PrismUtil.fileExists(codeFile)) {
                        return;
                    }

                    let code = PrismUtil.readFile(codeFile);
                    if (code) {
                        PrismUtil.runSessionScript({
                            info: {
                                command: true,
                                id: command.id,
                                name: command.name
                            },
                            session: session,
                            opts: opts,
                            intentDialog: config.intentDialog,
                            universalBot: config.universalBot,
                            cwd: config.cwd
                        }, code).catch((err) => {
                            Logger.error(`Command Failed: ${command.name}`);
                        });
                    }
                });
                Logger.debug(`Command Added: ${command.name}`);
            } catch (err) {
                Logger.error(err);
            }

            return resolve();
        });
    }
}
