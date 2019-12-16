const path = require('path');
const prism = require('prism-bot');

let keepAlive = new prism.KeepAlive({
    main: path.resolve(__dirname, 'instance.js')
});

let publish = new prism.PrismPublishServer({
    port: process.env.PRISM_PUBLISH_PORT || 9090,
    key: process.env.PRISM_PUBLISH_KEY,
    secret: process.env.PRISM_PUBLISH_SECRET,
    cwd: path.resolve(__dirname, 'prism-bot')
});

publish.on('shutdown', () => {
    keepAlive.shutdown();
});

publish.on('start', () => {
    keepAlive.start();
});

keepAlive.start();