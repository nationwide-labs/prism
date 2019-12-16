import { PrismNode } from "../PrismNode";
import { Logger } from "./../../Logger";
import { PrismUtil } from "../../PrismUtil";

export class PrismReference extends PrismNode {
    async setup() {
        this.universalBot.dialog('/prism-node-' + this.node.id, [async (session: any, args: any, next: any) => {
            this.hit(session);

            this.onBefore(session, {}).then(async (sandbox: any) => {
                if (sandbox['prism-exit']) {
                    return this.nextNode(session, sandbox);
                }
                sandbox.session = session;
                await this.run(session, sandbox);

                if (this.universalBot.dialogs && this.universalBot.dialogs['/prism-node-' + this.node.referenceNodeId]) {
                    return session.replaceDialog('/prism-node-' + this.node.referenceNodeId, {});
                } else if (this.universalBot.dialogs && this.universalBot.dialogs['/prism-intent-' + this.node.referenceIntentId]) {
                    return session.replaceDialog('/prism-intent-' + this.node.referenceIntentId, {});
                }

                return session.endDialog();
            }).catch(async (err) => {
                Logger.error(`On Before Error: Intent ${this.intent.id} Node ${this.node.id}`);

                session.send('Oops. Something went wrong and we need to start over.');

                return session.endDialog();
            });
        }]);
    }
}
