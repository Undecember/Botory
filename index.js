const { clientId, intents, submodules } = require('./config.json');
const { token } = require('./token.json');
const { Client, Intents } = require('discord.js');
const { db, builddb } = require('./db.js');
const client = new Client({ intents: parseInt(intents, 2) });

client.once('ready', () => {
    console.log('Ready!');
});

builddb().then(() => {
    client.login(token).then(() => {
        for (submodule of submodules) {
            const { _setup } = require('./submodules/' + submodule + '.js');
            _setup(client);
        }
    });
});
