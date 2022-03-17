const { db, sleep, SafeDB } = require('../../db.js');

module.exports = { _setup };

var StoryGuild;
async function _setup(client) {
    let stmt = 'SELECT id FROM guilds WHERE key = ?';
    const { id : StoryGuildId } = await SafeDB(stmt, 'get', 'story');
    StoryGuild = await client.guilds.fetch(StoryGuildId.toString());

    client.on('messageReactionAdd', async (r, u) => {
        return LogReaction(r, u, 1)});
    client.on('messageReactionRemove', async (r, u) => {
        return LogReaction(r, u, 0)});
}

async function LogReaction(reaction, user, ActionType) {
    try {
        if (reaction.message.guild === undefined) return;
        if (reaction.message.guild?.id != StoryGuild.id) return;
        if (user.bot) return;
        stmt = `INSERT INTO ReactionLog
            (timecode, UserId, ChannelId, MessageId,
                EmojiName, EmojiId, EmojiURL, ActionType)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        await SafeDB(stmt, 'run',
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
