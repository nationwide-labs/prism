import { IChannel } from "./channel/IChannel";
import { Logger } from "./Logger";
import { EventLogger } from "./EventLogger";
import { ADService } from "./auth/ADService";
import { PrismBot } from "./PrismBot";

class PrismConnectorConfig {
    server?: string;
    username?: string;
    password?: string;
    activeDirectory?: ADService;
    bot?: PrismBot;
}

export class PrismConnector {
    private onEventHandler: any;
    private onInvokeHandler: any;

    private channels: IChannel[] = [];
    private config: PrismConnectorConfig;

    constructor(config: PrismConnectorConfig) {
        this.config = config;
    }

    onEvent = (handler: any) => {
        this.onEventHandler = handler;
    }

    handle(message: any) {
        if (this.onEventHandler) {
            this.onEventHandler(message);
        }
    }

    onInvoke = (handler: any) => {
        this.onInvokeHandler = handler;
    }

    startConversation = (address: any, done: any) => {
        Logger.info('start convo?');
    }

    send = async (messages: any[], done: any) => {
        for (let i = 0; i < messages.length; i++) {
            let message = messages[i];

            let channel = this.getChannel(messages[i].address.channelId);
            if (channel) {
                if (message.type === 'message') {
                    EventLogger.get().botSaid({
                        text: message.text,
                        source: message.source,
                        conversationId: message.address.conversation.id
                    });
                }
                await channel.send(messages[i]).catch(() => { });
            }
        }
        return done(null);
    }

    getChannel(channelId: string): IChannel | void {
        for (let i = 0; i < this.channels.length; i++) {
            if (this.channels[i].channelId === channelId) {
                return this.channels[i];
            }
        }
        return undefined;
    }

    addChannel(channel: IChannel) {
        Logger.info('Adding Channel: ' + channel.channelId);

        this.channels.push(channel);

        channel.on('message', async (message) => {
            if (message.type === 'message') {
                try {
                    EventLogger.get().userSaid({
                        text: message.text,
                        source: message.source,
                        userId: message.address.user.id,
                        conversationId: message.address.conversation.id
                    });
                } catch (err) { }
            }

            if (this.config.activeDirectory) {
                message.address.user.ad = await this.config.activeDirectory.getUser(message.address.user.id).catch((err) => {
                    Logger.error(err);
                });
            }

            if (!this.config.bot) {
                return this.handle(message);
            }

            if (message.address.conversation.isGroup && !message.isTagged) {
                return this.config.bot.intercept(message).catch(() => { });
            }

            this.config.bot.intercept(message).then(() => {
                this.config.bot.interceptCommand(message).catch(() => {
                    this.handle(message);
                });
            }).catch(() => { });
        });
    }
}
