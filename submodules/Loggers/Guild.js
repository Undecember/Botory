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

    client.on('emojiCreate', ()=>{});
    client.on('emojiDelete', ()=>{});
    client.on('emojiUpdate', ()=>{});
    client.on('guildBanAdd', ()=>{});
    client.on('guildBanRemove', ()=>{});
    client.on('inviteCreate', ()=>{});
    client.on('inviteDelete', ()=>{});
    client.on('roleCreate', ()=>{});
    client.on('roleDelete', ()=>{});
    client.on('roleUpdate', ()=>{});
    client.on('roleUpdate', ()=>{});
    client.on('stickerCreate', ()=>{});
    client.on('stickerDelete', ()=>{});
    client.on('stickerUpdate', ()=>{});
}
