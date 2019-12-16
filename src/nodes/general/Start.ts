import { PrismNode } from "../PrismNode";

export class PrismStart extends PrismNode {
    run(session: any, sandbox: any) {
        return new Promise(async (resolve, reject) => {
            return resolve();
        });
    }
}
