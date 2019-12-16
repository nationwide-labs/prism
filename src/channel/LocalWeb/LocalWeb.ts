import { v4 as uuid } from 'uuid';
import { IChannel } from "../IChannel";
import { DirectLine } from './DirectLine';

class LocalWebConfig {
    port: string;
    stream: string;
    localUserId: string;
    localDisplayName?: string;
    user?: any;
}

export class LocalWeb extends IChannel {
    private directLine;

    constructor(config: LocalWebConfig) {
        super('local-web');
        if (!config.port) {
            config.port = '9091';
        }

        this.directLine = new DirectLine({
            port: config.port,
            web: this,
            secret: config.localUserId,
            stream: config.stream || 'ws://localhost:' + config.port,
            localUserId: config.localUserId,
            localDisplayName: config.localDisplayName,
            user: config.user
        });
    }

    send(message: any): Promise<any> {
        return new Promise(async (resolve, reject) => {
            if (message.type === 'message') {
                let id = uuid();

                let activity = {
                    id: id,
                    channelData: {
                        clientActivityID: id
                    },
                    type: 'message',
                    source: this.channelId,
                    channelId: this.channelId,
                    timestamp: new Date(),
                    attachments: message.attachments || [],
                    text: message.text,
                    conversation: {
                        id: message.address.conversation.id,
                        isGroup: false
                    },
                    from: {
                        id: 'bot',
                        name: 'bot',
                        role: 'bot'
                    }
                };
                this.directLine.send(message.address.conversation.id, activity);
            } else if (message.type === 'typing') {
                let typing = {
                    id: uuid.v1(),
                    type: 'typing',
                    timestamp: new Date(),
                    source: this.channelId,
                    channelId: this.channelId,
                    conversation: {
                        id: message.address.conversation.id,
                        isGroup: false
                    },
                    from: {
                        id: 'bot',
                        name: 'bot',
                        role: 'bot'
                    }
                };

                this.directLine.send(message.address.conversation.id, typing);
            }
            return resolve();
        });
    }
}
