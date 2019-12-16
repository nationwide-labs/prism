import { PrismInput } from "./Input";
import * as builder from 'botbuilder';

export class PrismInputTime extends PrismInput {
    ask(session: any, sandbox: any) {
        builder.Prompts.time(session, sandbox.message || '');
    }
}
