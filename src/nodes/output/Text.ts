import { PrismOutput } from "./Output";

export class PrismOutputText extends PrismOutput {
    say(session: any, sandbox: any) {
        session.send(sandbox.message);
    }
}
