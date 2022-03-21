const { db, sleep, SafeDB } = require('../../db.js');

module.exports = { _setup };

var StoryGuild;
async function _setup(client) {
    let stmt = 'SELECT id FROM guilds WHERE key = ?';
    const { id : StoryGuildId } = await SafeDB(stmt, 'get', 'story');
    StoryGuild = await client.guilds.fetch(StoryGuildId.toString());

    stmt = 'SELECT id FROM channels WHERE key = ?';
    const { id : FileChannelId } = await SafeDB(stmt, 'get', 'file');
    FileChannel = await StoryGuild.channels.fetch(FileChannelId.toString());

    client.on('messageCreate', ()=>{});
    client.on('messageDelete', ()=>{});
    client.on('messageDeleteBulk', ()=>{});
    client.on('messageUpdate', ()=>{});
}
