import { EventEmitter } from "events";

export class IChannel extends EventEmitter {
    public channelId: string;
    constructor(channelId: string) {
        super();
        this.channelId = channelId;
    }

    async send(message: any) { }
}
