const prism = require('prism-bot');
const path = require('path');
const builder = require('botbuilder');

(async () => {
    let prismBot = new prism.PrismBot({
        cwd: path.resolve(__dirname, 'prism-bot')
    });

    let connector = new prism.PrismConnector({
        bot: prismBot
    });

    let universalBot = new builder.UniversalBot(connector);

    let recognizer = new prism.PrismRecognizer({
        prismBot: prismBot
    });

    let intentDialog = new builder.IntentDialog({
        recognizers: [recognizer.getRecognizer()]
    });

    universalBot.dialog('/', intentDialog);

    universalBot.set('storage', new builder.MemoryBotStorage());

    universalBot.on('conversationUpdate', (message) => {
        prismBot.conversationUpdate(message);
    });

    await prismBot.setup({
        universalBot: universalBot,
        intentDialog: intentDialog,
        recognizer: recognizer,
        connector: connector
    }).catch(() => {});

    intentDialog.onDefault((session, args, next) => {
        prismBot.defaultAction(session, args, next);
    });

    connector.addChannel(new prism.LocalWeb({
        port: process.env.LOCAL_WEB_PORT || 9091,
        localUserId: 'john',
        localDisplayName: 'John Doe'
    }));
})();