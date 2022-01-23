const fs = require('fs');
const { v4: uuid4 } = require('uuid');
const { db } = require('../db.js');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

var StoryGuild;
function _setup(client) {
    stmt = db.prepare('SELECT id FROM guilds WHERE key = ?');
    client.guilds.fetch(stmt.get('story').id.toString()).then(g => {StoryGuild = g;});
    client.on('interactionCreate', async interaction => {
        if (!interaction.isCommand()) return;
        const { commandName } = interaction;
        try {
            if (commandName === 'message') return await cmd_message(interaction);
        } catch (e) { console.error(e); }
    });
}

module.exports = { _setup, DataFromMessage };

async function cmd_message(interaction) {
    cmd = interaction.options.getSubcommand();
    try {
        if (cmd == 'send') {
            link = interaction.options.getString('link');
            message = await MessageFromLink(interaction.client, link);
            MessageData = await DataFromMessage(message);
            await interaction.channel.send(MessageData);
            return await interaction.reply({ content: 'Message sent!', ephemeral: true });
        }
        if (cmd == 'json') {
            link = interaction.options.getString('link');
            message = await MessageFromLink(interaction.client, link);
            data = { content : message.content, embeds : message.embeds };
            JsonFileName = `${uuid4()}.json`;
            fs.writeFileSync(JsonFileName, JSON.stringify(data, null, 2));
            res = await interaction.reply({
                files: [{ attachment: JsonFileName }]
            });
            fs.unlinkSync(data);
            return res;
        }
        if (cmd == 'edit') {
            olink = interaction.options.getString('olink');
            link = interaction.options.getString('link');
            message = await MessageFromLink(interaction.client, link);
            MessageData = await DataFromMessage(message);
            message = await MessageFromLink(interaction.client, olink);
            await message.edit(MessageData);
            return await interaction.reply({ content: 'Message edited!', ephemeral: true });
        }
    } catch (e) {
        console.error(e);
        return await interaction.reply({ content: 'failed', ephemeral: true });
    }
}

async function MessageFromLink(client, link) {
    try {
        link = link.split('/').slice(4);
        const GuildId = link[0];
        const ChannelId = link[1];
        const MessageId = link[2];
        const Guild = await client.guilds.fetch(GuildId);
        const Channel = await Guild.channels.fetch(ChannelId);
        const Message = await Channel.messages.fetch(MessageId);
        return Message;
    } catch { return null; }
}

async function DataFromMessage(message) {
    result = {}
    if (message.content) result['content'] = message.content;
    result['embeds'] = message.embeds;
    result['files'] = []
    for (attachment of message.attachments) try {
        result['files'].push(attachment[1].url);
    } catch { }
    return result;
}
