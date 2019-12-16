import { fork } from 'child_process';
import * as path from 'path';

const RETRY_SECONDS = 5;

import { EventEmitter } from "events";
import { Logger } from './Logger';

class KeepAliveConfig {
    main: string;
}

export class KeepAlive extends EventEmitter {
    private known: boolean = false;
    private child: any;
    private main: string;

    constructor(config: KeepAliveConfig) {
        super();
        this.main = config.main;
    }

    start() {
        this.known = false;
        Logger.info('Starting Bot');

        if (!this.main) {
            return;
        }

        if (this.main.endsWith('.ts')) {
            this.child = fork(path.resolve(this.main), undefined, {
                env: process.env,
                stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
                execArgv: ['-r', 'ts-node/register']
            });
        } else {
            this.child = fork(path.resolve(this.main), undefined, {
                env: process.env,
                stdio: ['ignore', 'inherit', 'inherit', 'ipc']
            });
        }

        this.child.on('close', (code) => {
            if (!this.known) {
                Logger.error(`Process exited with code ${code}.`);
                Logger.error(`Trying again in ${RETRY_SECONDS} seconds.`);

                setTimeout(() => {
                    this.start();
                }, RETRY_SECONDS * 1000);
            }
        });
    }

    shutdown() {
        Logger.info('Restarting Bot');
        this.known = true;
        this.child.kill('SIGINT');
    }
}
