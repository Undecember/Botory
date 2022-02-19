const { clientId, intents } = require('./config.json');
const { token } = require('./token.json');
const { Client, Intents } = require('discord.js');

const client = new Client({ intents: parseInt(intents, 2) });

client.login(token).then(async() => {
    for (data of await client.application?.commands.fetch()) {
        console.log(data);
        await client.application?.commands.delete(data[0]);
    }
    console.log('clearing done');
    const { commands } = require('./commands.json');
    for (command of commands) {
        console.log('adding', command);
        let AppCommand = null;
        if (command.GuildId == 'global')
            AppCommand = await client.application?.commands.create(command.data);
        else AppCommand = await client.application?.commands.create(command.data, command.GuildId);
        if ('permissions' in command) {
            const permissions = command.permissions;
            await AppCommand.permissions.add({ permissions });
        }
    }
    console.log('adding done');
});
