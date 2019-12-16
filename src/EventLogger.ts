import { EventEmitter } from "events";

let instance: EventLogger;

export class EventLogger extends EventEmitter {

    static get() {
        if (!instance) {
            instance = new EventLogger();
        }
        return instance;
    }

    constructor() {
        super();
    }

    utteranceHit(body: any) {
        this.emit('utteranceHit', body);
    }

    intentHit(body: any) {
        this.emit('intentHit', body);
    }

    nodeHit(body: any) {
        this.emit('nodeHit', body);
    }

    commandHit(body: any) {
        this.emit('commandHit', body);
    }

    taskHit(body: any) {
        this.emit('taskHit', body);
    }

    botSaid(body: any) {
        this.emit('botSaid', body);
    }

    userSaid(body: any) {
        this.emit('userSaid', body);
    }
}
