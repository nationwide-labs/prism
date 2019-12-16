import { Intent } from "../models/Intent";
import { Node } from "../models/Node";
import { Logger } from "../Logger";
import { PrismNodeHelper } from "./PrismNodeHelper";
import { EventLogger } from "../EventLogger";
import { Bot } from "../models/Bot";

class PrismIntentConfig {
  bot: Bot;
  intent: Intent;
  intentDialog: any;
  universalBot: any;
  cwd: string;
  connector: any;
}

export class PrismIntent {
  static init(config: PrismIntentConfig) {
    let intent = config.intent;
    let bot = config.bot;
    let universalBot = config.universalBot;
    let intentDialog = config.intentDialog;
    let cwd = config.cwd;
    let startNode;

    return new Promise((resolve, reject) => {
      for (let i = 0; i < intent.nodes.length; i++) {
        if (intent.nodes[i].id === intent.defaultNodeId) {
          startNode = intent.nodes[i];
        }
      }

      for (let i = 0; i < intent.nodes.length; i++) {
        if (!startNode) {
          if (intent.nodes[i].type === 'start') {
            startNode = intent.nodes[i];
          }
        }

        PrismNodeHelper.init({
          bot: bot,
          intent: intent,
          node: intent.nodes[i],
          intentDialog: intentDialog,
          universalBot: universalBot,
          cwd: cwd,
          connector: config.connector
        });
      }

      if (config.bot.isUtterancesEnabled) {
        try {
          intentDialog.matches(intent.name, [(session: any, args: any, next: any) => {
            session.privateConversationData.args = args;
            try {
              EventLogger.get().utteranceHit({
                intentId: intent.id,
                userId: session.message.address.user.id,
                source: session.message.source,
                utterance: args.utterance,
                intent: args.intent,
                score: args.score,
                args: args
              });
            } catch (err) { }

            session.replaceDialog('/prism-intent-' + intent.id, {});
          }]);
        } catch (err) { }
      }

      let dialog = universalBot.dialog('/prism-intent-' + intent.id, (session: any, args: any, next: any) => {
        session.privateConversationData.args = args;

        try {
          EventLogger.get().intentHit({
            intentId: intent.id,
            source: session.message.source,
            userId: session.message.address.user.id
          });
        } catch (err) { }

        if (startNode) {
          session.replaceDialog('/prism-node-' + startNode.id, {});
        }
      });

      Logger.debug(`Intent Added: ${intent.name}`);

      if (intent.triggers.length > 0) {
        let words: string[] = [];

        for (let i = 0; i < intent.triggers.length; i++) {
          words.push(intent.triggers[i].name);
        }

        Logger.debug(`  => Triggers: ${words.join(', ')}`);

        dialog.triggerAction({
          matches: new RegExp('^(' + words.join('|') + ')$', 'i')
        });
      }

      return resolve();
    });
  }
}
