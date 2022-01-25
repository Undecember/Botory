const { guildId } = require('../config.json');
const { v4: uuid4 } = require('uuid');
const { db, sleep, SafeDB } = require('../db.js');

module.exports = { _setup };

var StoryGuild;
async function _setup(client) {
    let stmt = 'SELECT id FROM guilds WHERE key = ?';
    const { id : StoryGuildId } = await SafeDB(stmt, 'get', 'story');
    StoryGuild = await client.guilds.fetch(StoryGuildId.toString());

    stmt = 'SELECT ChannelId, MessageId FROM ReactionRoles';
    for (row of await SafeDB(stmt, 'all')) {
        channel = await StoryGuild.channels.fetch(row.ChannelId.toString());
        await channel.messages.fetch(row.MessageId.toString());
    }

    client.on('messageReactionAdd', async (messageReaction, user) => {
        return await onReaction(messageReaction, user, 'ADD');
    });
    client.on('messageReactionRemove', async (messageReaction, user) => {
        return await onReaction(messageReaction, user, 'REMOVE');
    });
}

async function onReaction(messageReaction, user, type) {
    try {
        let EmojiId = messageReaction.emoji.id;
        let EmojiName = messageReaction.emoji.name;
        let MessageId = messageReaction.message.id;
        let ChannelId = messageReaction.message.channel.id;
        let rule = null;
        if (EmojiId != null) {
            let stmt = `SELECT RoleId FROM ReactionRoles
                WHERE ChannelId = ? AND MessageId = ? AND EmojiId = ?`;
            rule = await SafeDB(stmt, 'get', ChannelId, MessageId, EmojiId);
        } else {
            stmt = `SELECT RoleId FROM ReactionRoles
                WHERE ChannelId = ? AND MessageId = ? AND EmojiName = ?
                AND EmojiId is NULL`;
            rule = await SafeDB(stmt, 'get', ChannelId, MessageId, EmojiName);
        }
        if (rule == null) return;
        let member = null;
        try {
            member = await StoryGuild.members.fetch(user.id);
        } catch { return; }
        let role = null;
        try {
            role = await StoryGuild.roles.fetch(rule.RoleId.toString());
        } catch { return; }
        if (type == 'ADD') member.roles.add(role).catch(console.error);
        else member.roles.remove(role).catch(console.error);
    } catch (e) { console.error(e); }
}
