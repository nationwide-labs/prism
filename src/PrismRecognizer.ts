import { Intent } from "./models/Intent";
import { Recognizer } from 'node-nlp';
import { PrismBot } from "./PrismBot";

class PrismRecognizerConfig {
    prismBot: PrismBot;
}

export class PrismRecognizer {
    private recognizer: any;

    constructor(config: PrismRecognizerConfig) {

        this.recognizer = new Recognizer();
        this.recognizer.nlpManager.addLanguage('en');

        config.prismBot.getIntents().then((intents: Intent[]) => {
            for (let i = 0; i < intents.length; i++) {
                let intent = intents[i];
                if (intent.utterances) {
                    for (let j = 0; j < intent.utterances.length; j++) {
                        let utterance = intent.utterances[j];
                        this.recognizer.nlpManager.addDocument('en', utterance.name, intent.name);
                    }
                }
            }
            this.recognizer.nlpManager.train();
        }).catch(() => { });
    }

    getRecognizer() {
        return this.recognizer;
    }
}
