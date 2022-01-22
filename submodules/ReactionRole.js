const { guildId } = require('../config.json');
const { v4: uuid4 } = require('uuid');
const { db } = require('../db.js');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

var StoryGuild;
function _setup(client) {
    stmt = db.prepare("SELECT id FROM guilds WHERE key = ?");
    const StoryGuildId = stmt.get('story').id;
    client.guilds.fetch(StoryGuildId.toString()).then(guild => {
        StoryGuild = guild;
        stmt = db.prepare("SELECT ChannelId, MessageId FROM ReactionRoles");
        for (row of stmt.all()) try {
            StoryGuild.channels.fetch(row.ChannelId.toString()).then(async channel => {
                await channel.messages.fetch(row.MessageId);
            });
        } catch (e) { console.error(e); }
    });
    client.on('messageReactionAdd', async (messageReaction, user) => {
        try { return await onReaction(messageReaction, user, 'ADD'); } catch {}
    });
    client.on('messageReactionRemove', async (messageReaction, user) => {
        try { return await onReaction(messageReaction, user, 'REMOVE'); } catch {}
    });
}

module.exports = { _setup };

async function onReaction(messageReaction, user, type) {
    EmojiId = messageReaction.emoji.id;
    MessageId = messageReaction.message.id;
    ChannelId = messageReaction.message.channel.id;
    stmt = db.prepare(`SELECT RoleId FROM ReactionRoles
        WHERE ChannelId = ? AND MessageId = ? AND EmojiId = ?`);
    rule = stmt.get(ChannelId, MessageId, EmojiId);
    if (rule == null) return;
    member = null;
    try { member = await StoryGuild.members.fetch(user.id); } catch { }
    if (member == null) return;
    role = null;
    try { role = await StoryGuild.roles.fetch(rule.RoleId.toString()); } catch { }
    if (role == null) return;
    if (type == 'ADD') member.roles.add(role).catch(console.error);
    else member.roles.remove(role).catch(console.error);
}
