import chalk from 'chalk';

export class Logger {
    static info(message) {
        this.chalkLog(chalk.cyan, message);
    }

    static log(message) {
        this.chalkLog(chalk.blue, message);
    }

    static error(message) {
        this.chalkLog(chalk.red, message);
    }

    static success(message) {
        this.chalkLog(chalk.green, message);
    }

    static details(message) {
        this.chalkLog(chalk.hex('#ffa500'), message);
    }

    static get isDebug() {
        return process.env.PRISM_DEBUG === 'true';
    }

    static debug(message) {
        if (Logger.isDebug) {
            this.chalkLog(chalk.hex('#ffa500'), message);
        }
    }

    static chalkLog(fn, message) {
        try {
            if (!this.isObject(message)) {
                return console.log(fn(message));
            }
            console.log(fn(JSON.stringify(message, null, 4)));
        } catch (err) { }
    }

    static isObject(val) {
        return val instanceof Object;
    }
}
