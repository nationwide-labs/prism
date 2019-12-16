import { Trigger } from "./Trigger";
import { Utterance } from "./Utterance";
import { Node } from "./Node";

export class Intent {
    id: string;
    name: string;
    triggers: Trigger[]; 
    utterances: Utterance[];
    nodes: Node[];
    isEnabled: boolean;
    defaultNodeId: string;

    public folder: string;

    normalize() {
        let triggers: Trigger[] = [];
        try {
            for (let i = 0; i < this.triggers.length; i++) {
                let trigger = new Trigger();
                Object.assign(trigger, this.triggers[i]);
                triggers.push(trigger);
            }
        } catch (err) { }
        this.triggers = triggers;

        let utterances: Utterance[] = [];
        try {
            for (let i = 0; i < this.utterances.length; i++) {
                let utterance = new Utterance();
                Object.assign(utterance, this.utterances[i]);
                utterances.push(utterance);
            }
        } catch (err) { }
        this.utterances = utterances;

        let nodes: Node[] = [];
        try {
            for (let i = 0; i < this.nodes.length; i++) {
                let node = new Node();
                Object.assign(node, this.nodes[i]);
                node.normalize();
                nodes.push(node);
            }
        } catch (err) { }
        this.nodes = nodes;
    }
}
