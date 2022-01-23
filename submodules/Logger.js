const { db } = require('../db.js');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

var StoryGuild, AttachmentChannel, EmojiChannel;
function _setup(client) {
    stmt = db.prepare('SELECT id FROM channels WHERE key = ?');
    const AttachmentChannelId = stmt.get('attachment').id;
    const EmojiChannelId = stmt.get('emoji').id;
    stmt = db.prepare('SELECT id FROM guilds WHERE key = ?');
    client.guilds.fetch(stmt.get('story').id.toString()).then(async (guild) => {
        StoryGuild = guild;
        AttachmentChannel = await StoryGuild.channels.fetch(AttachmentChannelId.toString());
        EmojiChannel = await StoryGuild.channels.fetch(EmojiChannelId.toString());
    });
    client.on('messageCreate', LogAttachment);
    client.on('messageReactionAdd', async (r, u) => {
        return LogReactionEmoji(r, u, 1)});
    client.on('messageReactionRemove', async (r, u) => {
        return LogReactionEmoji(r, u, 0)});
    client.on('interactionCreate', async interaction => {
        if (!interaction.isCommand()) return;
        const { commandName } = interaction;
        try {
            if (commandName === 'co') return await cmd_lookup(interaction);
        } catch (e) { console.error(e); }
    });
}

module.exports = { _setup };

async function LogAttachment(message) {
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
}

async function LogReactionEmoji(reaction, user, ActionType) {
    if (reaction.message.guild === undefined) return;
    if (reaction.message.guild?.id != StoryGuild.id) return;
    if (user.bot) return;
    stmt = db.prepare(`INSERT INTO ReactionLog
        (timecode, UserId, ChannelId, MessageId,
            EmojiName, EmojiId, EmojiURL, ActionType)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    try {
        stmt.run(
            new Date().getTime(),
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
