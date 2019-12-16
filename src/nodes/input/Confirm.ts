import { PrismInput } from "./Input";
import * as builder from 'botbuilder';

export class PrismInputConfirm extends PrismInput {

    ask(session: any, sandbox: any) {
        builder.Prompts.confirm(session, sandbox.message || '');
    }

    answer(session: any, args: any) {
        let answerText = args && args.response ? 'Yes' : 'No';
        let nextNodeId;
        for (let i = 0; i < this.node.answers.length; i++) {
            let answer = this.node.answers[i];
            if (answer.name === answerText) {
                nextNodeId = answer.nextNodeId;
            }
        }
        return nextNodeId;
    }
}
