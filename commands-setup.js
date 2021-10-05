const { clientId, intents } = require('./config.json');
const { token } = require('./token.json');
const { db, builddb } = require('./db.js');
const { Client, Intents } = require('discord.js');

const client = new Client({ intents: parseInt(intents, 2) });

builddb().then(() => {
    const stmt = db.prepare("SELECT id FROM guilds WHERE key = ?");
    const guildId = stmt.get('story').id;
    client.login(token).then(async() => {
        guild = await client.guilds.fetch(guildId.toString());
        for (data of await client.application?.commands.fetch()) {
            console.log('clearing');
            await client.application?.commands.delete(data[0]);
            console.log(data);
        }
        console.log('clearing done');
        let { commands } = require('./commands.json');
        for (command of commands) {
            console.log('adding');
            if ('permissions' in command) {
                let permissions = command['permissions'];
                delete command['permissions'];
                command = await client.application?.commands.create(command, guildId);
                await command.permissions.add({ permissions });
            }
            else command = await client.application?.commands.create(command, guildId);
            console.log(command);
        }
        console.log('adding done');
    });
});
