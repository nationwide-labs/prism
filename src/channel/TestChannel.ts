import { IChannel } from "./IChannel";
import { v4 as uuid } from 'uuid';

class TestChannelConfig {
    userId: string;
    userName: string;
}

export class TestChannel extends IChannel {
    private resolve: any;
    private config: TestChannelConfig;

    constructor(config: TestChannelConfig) {
        super('test');
        this.config = config;
    }

    next(): Promise<any> {
        return new Promise((resolve, reject) => {
            this.resolve = resolve;
        });
    }

    send(message: any): Promise<any> {
        if (message.type === 'message') {
            if (message.text) {
                return new Promise((res, rej) => {
                    if (this.resolve) {
                        this.resolve(message);
                        this.resolve = undefined;
                    }
                    return res();
                });
            }
        } else if (message.type === 'typing') {
            return new Promise((res, rej) => {
                return res();
            });
        }
        return new Promise((res, rej) => {
            return rej();
        });
    }

    say(text: string) {
        this.emit('message', {
            type: 'message',
            agent: 'user',
            source: this.channelId,
            timestamp: new Date(),
            text: text,
            channelData: {
                clientActivityID: uuid()
            },
            attachments: undefined,
            address: {
                channelId: this.channelId,
                user: {
                    id: this.config.userId,
                    name: this.config.userName
                },
                conversation: {
                    id: this.config.userId,
                    isGroup: false
                }
            }
        });
    }
}
