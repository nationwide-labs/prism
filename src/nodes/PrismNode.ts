import { PrismUtil } from "../PrismUtil";
import { Node } from "../models/Node";
import { Intent } from "../models/Intent";
import { Logger } from "../Logger";
import { EventLogger } from "../EventLogger";
import { Bot } from "../models/Bot";
import * as path from 'path';

export class PrismNodeConfig {
  bot: Bot;
  intent: Intent;
  node: Node;
  intentDialog: any;
  universalBot: any;
  cwd: string;
  connector: any;
}

export class PrismNode {
  public node: Node;
  public intent: Intent;
  public bot: Bot;
  public intentDialog: any;
  public universalBot: any;
  public connector: any;
  public cwd: string;

  constructor(config: PrismNodeConfig) {
    this.bot = config.bot;
    this.intent = config.intent;
    this.node = config.node;
    this.intentDialog = config.intentDialog;
    this.universalBot = config.universalBot;
    this.cwd = config.cwd;
    this.connector = config.connector;

    this.setup();
  }

  async setup() {
    this.universalBot.dialog('/prism-node-' + this.node.id, [async (session: any, args: any, next: any) => {
      this.hit(session);

      this.onBefore(session, {}).then(async (sandbox: any) => {
        if (sandbox['prism-exit']) {
          return this.nextNode(session, sandbox);
        }

        sandbox.session = session;
        await this.run(session, sandbox);

        let onAfterCode: any = await this.onAfter(session, {}).catch(() => { });

        this.nextNode(session, onAfterCode);
      }).catch(async (err) => {
        Logger.error(`On Before Error: Intent ${this.intent.id} Node ${this.node.id}`);

        session.send('Oops. Something went wrong and we need to start over.');

        return session.endDialog();
      });
    }]);
  }

  hit(session: any) {
    try {
      delete session.privateConversationData['prism-response'];

      EventLogger.get().nodeHit({
        nodeId: this.node.id,
        intentId: this.intent.id,
        source: session.message.source,
        userId: session.message.address.user.id
      });

    } catch (err) { }
  }

  run(session: any, sandbox: any) {
    return new Promise(async (resolve, reject) => {
      return resolve();
    });
  }

  stringifyAddress(session: any) {
    let address = session.message.address;
    return address.channelId + '.' + address.conversation.id; // + '.' + address.user.id;
  }

  onBefore = (session: any, extra: any) => {
    return new Promise(async (resolve, reject) => {
      let sandbox: any = {};
      if (!this.node.isCodeBeforeEnabled) {
        return resolve(sandbox);
      }

      let codeFile = path.resolve(this.intent.folder, 'code',
        (this.node.codeBeforeFile || `node-${this.node.id}-before.js`)
      );

      if (!PrismUtil.fileExists(codeFile)) {
        return resolve(sandbox);
      }

      let code = await PrismUtil.readFile(codeFile);

      if (!code) {
        return resolve(sandbox);
      }

      PrismUtil.runSessionScript({
        info: {
          onBefore: true,
          intentId: this.intent.id,
          nodeId: this.node.id
        },
        session: session,
        speakSlow: this.bot.speakSlow,
        intentDialog: this.intentDialog,
        universalBot: this.universalBot,
        connector: this.connector,
        cwd: this.cwd
      }, code).then((resultSandbox) => {
        return resolve(resultSandbox);
      }).catch((err) => {
        return reject(err);
      });
    });
  }

  onAfter = (session: any, extra: any) => {
    return new Promise(async (resolve, reject) => {
      let sandbox: any = {};
      if (!this.node.isCodeAfterEnabled) {
        return resolve(sandbox);
      }

      let codeFile = path.resolve(this.intent.folder, 'code',
        (this.node.codeAfterFile || `node-${this.node.id}-after.js`)
      );

      if (!PrismUtil.fileExists(codeFile)) {
        return resolve(sandbox);
      }

      let code = PrismUtil.readFile(codeFile);

      if (!code) {
        return resolve(sandbox);
      }

      PrismUtil.runSessionScript({
        info: {
          onAfter: true,
          intentId: this.intent.id,
          nodeId: this.node.id
        },
        session: session,
        speakSlow: this.bot.speakSlow,
        intentDialog: this.intentDialog,
        universalBot: this.universalBot,
        connector: this.connector,
        cwd: this.cwd
      }, code).then((resultSandbox) => {
        return resolve(resultSandbox);
      }).catch((err) => {
        return reject(err);
      });
    });
  }

  nextNode(session: any, sandbox: any) {
    let nextNodeId = sandbox.nextNodeId;
    if (sandbox['prism-exit']) {
      return session.endDialog();
    } else if (sandbox['prism-state-name']) {
      for (let i = 0; i < this.node.states.length; i++) {
        let state = this.node.states[i];
        if (state.name === sandbox['prism-state-name']) {
          nextNodeId = state.nextNodeId;
        }
      }

      if (!nextNodeId) {
        // maybe it was an answer?
        for (let i = 0; i < this.node.answers.length; i++) {
          let answer = this.node.answers[i];
          if (answer.name === sandbox['prism-state-name']) {
            nextNodeId = answer.nextNodeId;
          }
        }
      }
    }

    if (!nextNodeId) {
      nextNodeId = this.node.defaultNodeId;
    }

    if (nextNodeId) {
      session.replaceDialog('/prism-node-' + nextNodeId, {});
    } else {
      session.endDialog();
    }
  }
}
