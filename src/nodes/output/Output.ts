import { PrismNode } from "../PrismNode";
import { PrismUtil } from "../../PrismUtil";

export class PrismOutput extends PrismNode {
    run(session: any, sandbox: any) {
        return new Promise(async (resolve, reject) => {
            let message = this.node.text || '';
            if (sandbox && sandbox.text) {
                message = sandbox.text;
            }

            message = PrismUtil.templateText(message, sandbox);
            sandbox.message = message;

            if (this.bot.speakSlow) {
                let milliseconds = PrismUtil.timeToWrite(message);
                await PrismUtil.wait(session, milliseconds);
            }

            await this.say(session, sandbox);
            return resolve();
        });
    }

    say(session: any, sandbox: any) { }
}
