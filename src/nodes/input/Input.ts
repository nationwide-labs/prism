import { PrismNode } from "../PrismNode";
import { PrismUtil } from "../../PrismUtil";
import { Logger } from "../../Logger";

export class PrismInput extends PrismNode {

  async setup() {
    this.universalBot.dialog('/prism-node-' + this.node.id, [async (session: any, args: any, next: any) => {
      this.hit(session);

      await this.onBefore(session, {}).then(async (sandbox: any) => {
        if (sandbox['prism-exit']) {
          return this.nextNode(session, sandbox);
        } else if (sandbox['skip']) {
          return this.nextNode(session, sandbox);
        }
        sandbox.session = session;
        await this.run(session, sandbox);
      }).catch(async (err) => {
        Logger.error(`On Before Error: Intent ${this.intent.id} Node ${this.node.id}`);

        session.send('Oops. Something went wrong and we need to start over.');

        return session.endDialog();
      });
    },
    async (session: any, args: any, next: any) => {
      let nextNodeId = await this.answer(session, args);

      session.privateConversationData['prism-response'] = args.response;
      if (this.node.variable) {
        session.privateConversationData[this.node.variable] = args.response;
      }

      this.onAfter(session, {
        response: args.response
      }).then((sandbox: any) => {
        sandbox.nextNodeId = nextNodeId;
        this.nextNode(session, sandbox);
      }).catch(async (err) => {
        Logger.error(`On After Error: Intent ${this.intent.id} Node ${this.node.id}`);

        session.send('Oops. Something went wrong and we need to start over.');

        return session.endDialog();
      });
    }]);
  }

  run(session: any, sandbox: any) {
    return new Promise(async (resolve, reject) => {
      let message = this.node.text || '';
      if (sandbox && sandbox.prompt) {
        message = sandbox.prompt;
      }

      message = PrismUtil.templateText(message, sandbox);
      sandbox.message = message;

      if (this.bot.speakSlow) {
        let milliseconds = PrismUtil.timeToWrite(message);
        await PrismUtil.wait(session, milliseconds);
      }

      await this.ask(session, sandbox);
      return resolve();
    });
  }

  ask(session: any, sandbox: any) { }

  answer(session: any, args: any) { }
}
