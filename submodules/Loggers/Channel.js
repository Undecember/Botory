const { db, sleep, SafeDB } = require('../../db.js');

module.exports = { _setup, AuditLogger };

var StoryGuild;
async function _setup(client) {
    let stmt = 'SELECT id FROM guilds WHERE key = ?';
    const { id : StoryGuildId } = await SafeDB(stmt, 'get', 'story');
    StoryGuild = await client.guilds.fetch(StoryGuildId.toString());

    stmt = 'SELECT id FROM channels WHERE key = ?';
    const { id : LChannelChannelId } = await SafeDB(stmt, 'get', 'LChannel');
    LChannelChannel = await StoryGuild.channels.fetch(LChannelChannelId.toString());
}

async function AuditLogger(AuditLog) {
}
