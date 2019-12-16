import { Answer } from "./Answer";
import { State } from "./State";

export class Node {
    public id: string;
    public text: string;
    public type: string;
    public states: State[];
    public answers: Answer[];
    public defaultNodeId: string;
    public variable: string;
    public referenceIntentId: string;
    public referenceNodeId: string;

    public codeBeforeFile: string;
    public codeAfterFile: string;

    public isCodeBeforeEnabled: boolean;
    public isCodeAfterEnabled: boolean;

    normalize() {
        let states: State[] = [];
        try {
            for (let i = 0; i < this.states.length; i++) {
                let state = new State();
                Object.assign(state, this.states[i]);
                states.push(state);
            }
        } catch (err) { }
        this.states = states;

        let answers: Answer[] = [];
        try {
            for (let i = 0; i < this.answers.length; i++) {
                let answer = new Answer();
                Object.assign(answer, this.answers[i]);
                answers.push(answer);
            }
        } catch (err) { }

        answers.sort((a, b) => {
            if (a.order !== undefined && b.order !== undefined) {
                if (a.order > b.order) {
                    return 1;
                } else if (a.order < b.order) {
                    return -1;
                }
            }
            return (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase());
        });

        this.answers = answers;
    }
}
