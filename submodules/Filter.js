const { ops } = require('../config.json');
const { v4: uuid4 } = require('uuid');
const { db, sleep, SafeDB } = require('../db.js');
const { ban } = require('./Moderator.js');

module.exports = { _setup };

function uuid4hex() {
    let buffer = Buffer.alloc(16);
    uuid4({}, buffer);
    return buffer.toString('hex');
}

var StoryGuild, BanCount, BanTime;
async function _setup(client) {
    let stmt = 'SELECT id FROM guilds WHERE key = ?';
    const { id : StoryGuildId } = await SafeDB(stmt, 'get', 'story');
    StoryGuild = await client.guilds.fetch(StoryGuildId.toString());

    stmt = 'SELECT value FROM global WHERE key = ?';
    BanCount = (await SafeDB(stmt, 'get', 'BanCount')).value;
    BanTime = (await SafeDB(stmt, 'get', 'BanTime')).value;

    await FetchMessages(client);
    console.log('fetched');
    AutoJoinThreads(client);

    client.on('messageReactionAdd', FilterReaction);
}

async function AutoJoinThreads(client) {
    while (true) {
        await sleep(5 * 60 * 1000);
        await JoinThreads(client);
    }
}

async function JoinThreads(client) {
    try {
        const channels = await StoryGuild.channels.fetch();
        for (const item of channels) if (item[1].isText()) {
            const channel = item[1];
            let threads = [];
            for (const item of (await channel.threads.fetchActive()).threads) threads.push(item[1]);
            for (const thread of threads) await thread.join();
        }
    } catch (e) { console.error(e); }
}

async function FetchMessages(client) {
    await JoinThreads(client);
    const channels = await StoryGuild.channels.fetch();
    for (const item of channels) if (item[1].isText()) {
        const channel = item[1];
        await channel.messages.fetch({ limit : 100 });
        let threads = [];
        for (const item of (await channel.threads.fetchActive()).threads) threads.push(item[1]);
        for (const item of (await channel.threads.fetchArchived()).threads) threads.push(item[1]);
        for (const thread of threads) await thread.messages.fetch({ limit : 100 });
    }
}

async function FilterReaction(reaction, user) {
    try {
        if (reaction.message.guild === undefined) return;
        if (reaction.message.guild?.id != StoryGuild.id) return;
        if (user.bot) return;
        let row;
        if (reaction.emoji.id == null) {
            const stmt = 'SELECT * FROM BannedEmojis WHERE EmojiName = ? AND EmojiId is NULL';
            row = await SafeDB(stmt, 'get', reaction.emoji.name);
        } else {
            const stmt = 'SELECT * FROM BannedEmojis WHERE EmojiId = ?';
            row = await SafeDB(stmt, 'get', reaction.emoji.id);
        }
        if (row === undefined) return;
        await reaction.remove();
        await warn(reaction.client, reaction.message.channel, user.id, row.comment);
    } catch (e) { console.error(e); }
}

async function warn(client, channel, UserId, reason) {
    if (ops.indexOf(UserId.toString()) >= 0) return;
    let stmt = `INSERT INTO infractions (id, UserId, ModeratorId, reason, timecode)
        VALUES (?, ?, ?, ?, ?)`;
    await SafeDB(stmt, 'run', uuid4hex().slice(0, 10), UserId, client.user.id, reason, Date.now());
    let user = await client.users.fetch(UserId);
    let fields = [];
    await channel.send({
        embeds: [{
            author: {
                name: `${user.username}#${user.discriminator}`,
                iconURL: user.displayAvatarURL()
            },
            title: '경고',
            fields: [{
                name: '사유',
                value: reason
            }]
        }]
    });
    let deadline = BigInt(Date.now()) - BanTime;
    stmt = `SELECT id FROM infractions WHERE UserId = ? AND timecode > ? LIMIT 5`;
    if ((await SafeDB(stmt, 'all', UserId, deadline)).length >= BanCount)
        await channel.send(await ban(client, UserId, '경고 누적'));
}
