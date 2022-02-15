const fs = require('fs');
const { v4: uuid4 } = require('uuid');
const { db, sleep, SafeDB } = require('../db.js');
const { DataFromMessage } = require('./MessageManager.js');
const { ops } = require('../config.json');

module.exports = { _setup };

var StoryGuild, StudioGuild;
async function _setup(client) {
    let stmt = 'SELECT id FROM guilds WHERE key = ?';
    const { id : StoryGuildId } = await SafeDB(stmt, 'get', 'story');
    const { id : StudioGuildId } = await SafeDB(stmt, 'get', 'studio');
    StoryGuild = await client.guilds.fetch(StoryGuildId.toString());
    StudioGuild = await client.guilds.fetch(StudioGuildId.toString());

    client.on('interactionCreate', async interaction => {
        try { try {
            if (!interaction.isCommand()) return;
            const { commandName } = interaction;
            if (commandName === 'docs') return await cmd_docs(interaction);
        } catch (e) {
            console.error(e);
            return await interaction.reply({ content: 'failed' });
        } } catch (e) { console.error(e); }
    });
}

var LastCall;
async function cmd_docs(interaction) {
    if (Date.now() - LastCall < 10 * 1000 && ops.indexOf(interaction.user.id.toString()) < 0)
        return await interaction.reply({ content: '10초에 한 번만 쓸 수 있습니다.', ephemeral: true });
    const LastLastCall = LastCall;
    LastCall = Date.now();
    const name = interaction.options.getString('name');
    const stmt = 'SELECT * FROM docs WHERE name = ?';
    const doc = await SafeDB(stmt, 'get', name);
    if (doc === undefined) {
        LastCall = LastLastCall;
        return await interaction.reply({ content: '해당 문서를 찾을 수 없습니다.', ephemeral: true });
    }
    const channel = await StudioGuild.channels.fetch(doc.ChannelId.toString());
    const message = await channel.messages.fetch(doc.MessageId.toString());
    const MessageData = await DataFromMessage(message);
    return await interaction.reply(MessageData);
}
