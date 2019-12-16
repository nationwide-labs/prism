import { Logger } from "../Logger";
import { EventLogger } from "../EventLogger";
import * as  schedule from 'node-schedule';
import { Task } from "../models/Task";
import * as  path from 'path';
import { PrismUtil } from "../PrismUtil";

class PrismTaskConfig {
    task: Task;
    cwd: string;
    intentDialog: any;
    universalBot: any;
}

export class PrismTask {
    static init(config: PrismTaskConfig) {
        let task = config.task;

        return new Promise((resolve, reject) => {
            try {
                schedule.scheduleJob(task.schedule, (fireDate) => {
                    Logger.info(`Running Task: ${task.name}`);
                    try {
                        EventLogger.get().taskHit({
                            taskId: task.id
                        });
                    } catch (err) { }

                    let codeFile = path.resolve(task.folder,
                        (config.task.codeFile || 'code.js')
                    );

                    if (!PrismUtil.fileExists(codeFile)) {
                        return;
                    }

                    let code = PrismUtil.readFile(codeFile);
                    if (code) {
                        PrismUtil.runScript({
                            info: {
                                task: true,
                                id: task.id,
                                name: task.name
                            },
                            intentDialog: config.intentDialog,
                            universalBot: config.universalBot,
                            cwd: config.cwd
                        }, code).catch((err) => {
                            Logger.error(`Task Failed: ${task.name}`);
                        });
                    }
                });
                Logger.debug(`Task Added: ${task.name}`);
            } catch (err) {
                Logger.error(err);
            }
            return resolve();
        });
    }
}
