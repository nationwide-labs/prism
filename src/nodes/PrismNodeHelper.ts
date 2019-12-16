import { PrismOutputText } from "./output/Text";
import { PrismInputText } from "./input/Text";
import { PrismInputMultipleChoice } from "./input/MultipleChoice";
import { PrismInputConfirm } from "./input/Confirm";
import { PrismInputNumber } from "./input/Number";
import { PrismInputTime } from "./input/Time";
import { PrismReference } from "./general/Reference";
import { PrismPlain } from "./general/Plain";
import { PrismStart } from "./general/Start";
import { Logger } from "../Logger";
import { PrismNodeConfig } from "./PrismNode";

export class PrismNodeHelper {
  static init(config: PrismNodeConfig) {
    return new Promise(async (resolve, reject) => {
      let node = config.node;
      let nodeObj;
      try {
        switch (node.type) {
          case 'start':
            nodeObj = new PrismStart(config);
            break;
          case 'output.text':
            nodeObj = new PrismOutputText(config);
            break;
          case 'input.text':
            nodeObj = new PrismInputText(config);
            break;
          case 'input.multipleChoice':
            nodeObj = new PrismInputMultipleChoice(config);
            break;
          case 'input.yesNo':
            nodeObj = new PrismInputConfirm(config);
            break;
          case 'input.number':
            nodeObj = new PrismInputNumber(config);
            break;
          case 'input.date':
            nodeObj = new PrismInputTime(config);
            break;
          case 'reference':
            nodeObj = new PrismReference(config);
            break;
          case 'plain':
            nodeObj = new PrismPlain(config);
            break;
          default:
            Logger.error('Bad Node Type: ' + node.type);
        }
      } catch (err) {
        Logger.error(err);
      }
      return resolve();
    });
  }
}
