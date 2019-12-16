import { PrismInput } from "./Input";
import * as builder from 'botbuilder';

export class PrismInputText extends PrismInput {
    ask(session: any, sandbox: any) {
        builder.Prompts.text(session, sandbox.message || '');
    }
}
