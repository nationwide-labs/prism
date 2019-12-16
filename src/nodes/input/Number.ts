import { PrismInput } from "./Input";
import * as builder from 'botbuilder';

export class PrismInputNumber extends PrismInput {
    ask(session: any, sandbox: any) {
        builder.Prompts.number(session, sandbox.message || '');
    }
}
