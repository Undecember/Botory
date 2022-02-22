const { db, sleep, SafeDB } = require('../db.js');

module.exports = { _setup };

var StoryGuild, AttachmentChannel, EmojiChannel;
async function _setup(client) {
    let stmt = 'SELECT id FROM guilds WHERE key = ?';
    const { id : StoryGuildId } = await SafeDB(stmt, 'get', 'story');
    StoryGuild = await client.guilds.fetch(StoryGuildId.toString());

    stmt = 'SELECT id FROM channels WHERE key = ?';
    const { id : AttachmentChannelId } = await SafeDB(stmt, 'get', 'attachment');
    const { id : EmojiChannelId } = await SafeDB(stmt, 'get', 'emoji');
    AttachmentChannel = await StoryGuild.channels.fetch(AttachmentChannelId.toString());
    EmojiChannel = await StoryGuild.channels.fetch(EmojiChannelId.toString());

    client.on('messageCreate', LogAttachment);
    client.on('messageReactionAdd', async (r, u) => {
        return LogReactionEmoji(r, u, 1)});
    client.on('messageReactionRemove', async (r, u) => {
        return LogReactionEmoji(r, u, 0)});
    client.on('interactionCreate', async interaction => {
        try { try {
            if (!interaction.isCommand()) return;
            const { commandName } = interaction;
            if (commandName === 'co') return await cmd_lookup(interaction);
        } catch (e) {
            console.error(e);
            return await interaction.reply({ content: 'failed' });
        } } catch (e) { console.error(e); }
    });
}

async function LogAttachment(message) {
    try {
        if (message.guild === undefined) return;
        if (message.guild?.id != StoryGuild.id) return;
        if (message.author === undefined) return;
        if (message.author.bot) return;
        if (message.attachments.size == 0) return;
        files = []
        for (data of message.attachments) files.push(data[1].url);
        AttachmentChannel.send({
            files: files,
            embeds: [{
                author: {
                    name: `${message.author.username}#${message.author.discriminator}`,
                    iconURL: message.author.displayAvatarURL()
                },
                description: `Attachment from [a message](${message.url})`
                    + ` in <#${message.channelId}>`,
                fields: [
                    {
                        name: 'User ID',
                        value: message.author.id,
                        inline: false
                    },
                    {
                        name: 'Message ID',
                        value: message.id
                    }
                ]
            }]
        }).catch(console.error);
    } catch (e) { console.error(e); }
}

async function LogReactionEmoji(reaction, user, ActionType) {
    try {
        if (reaction.message.guild === undefined) return;
        if (reaction.message.guild?.id != StoryGuild.id) return;
        if (user.bot) return;
        stmt = `INSERT INTO ReactionLog
            (timecode, UserId, ChannelId, MessageId,
                EmojiName, EmojiId, EmojiURL, ActionType)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        await SafeDB(stmt, 'run',
            Date.now(),
            user.id,
            reaction.message.channel.id,
            reaction.message.id,
            reaction.emoji.name,
            reaction.emoji.id,
            reaction.emoji.url,
            ActionType);
    } catch (e) { console.error(e); }
}

async function cmd_lookup(interaction) {
    interaction.reply('coming soon');
}
