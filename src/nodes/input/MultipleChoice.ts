import { PrismInput } from "./Input";
import * as builder from 'botbuilder';

export class PrismInputMultipleChoice extends PrismInput {

    ask(session: any, sandbox: any) {
        let results = sandbox.results || [];
        if (results.length === 0) {
            for (let i = 0; i < this.node.answers.length; i++) {
                results.push(this.node.answers[i].name);
            }
        }
        results.sort((a: string, b: string) => {
            return (a || '').toLowerCase().localeCompare((b || '').toLowerCase());
        });
        builder.Prompts.choice(session, sandbox.message || '', results.join('|'));
    }

    answer(session: any, args: any) {
        let response = args.response.entity;
        let nextNodeId;
        for (let i = 0; i < this.node.answers.length; i++) {
            let answer = this.node.answers[i];
            if (answer.name === response) {
                nextNodeId = answer.nextNodeId;
            }
        }
        return nextNodeId;
    }
}
