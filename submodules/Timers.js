const fs = require('fs');
const { v4: uuid4 } = require('uuid');
const { db, sleep, SafeDB } = require('../db.js');
const { DataFromMessage } = require('./MessageManager.js');

module.exports = { _setup };

var StoryGuild, StudioGuild, ArchiveChannel;
async function _setup(client) {
    let stmt = 'SELECT id FROM guilds WHERE key = ?';
    const { id : StudioGuildId } = await SafeDB(stmt, 'get', 'studio');
    const { id : StoryGuildId } = await SafeDB(stmt, 'get', 'story');
    StoryGuild = await client.guilds.fetch(StoryGuildId.toString());
    StudioGuild = await client.guilds.fetch(StudioGuildId.toString());

    stmt = 'SELECT id FROM channels WHERE key = ?';
    const { id : ArchiveChannelId } = await SafeDB(stmt, 'get', 'archive');
    ArchiveChannel = await StudioGuild.channels.fetch(ArchiveChannelId.toString());

    TimerMessage();
}

async function TimerMessage(interaction) {
    const stmt = 'SELECT * FROM timers';
    while (true) {
        const timers = await SafeDB(stmt, 'all');
        for (const timer of timers) {
            const TimeFlag = BigInt(Date.now());
            if (TimeFlag - timer.LastSent > timer.interval) {
                const Ustmt = 'UPDATE timers SET LastSent = LastSent + ? WHERE MessageId = ?';
                await SafeDB(Ustmt, 'run',
                    (TimeFlag - timer.LastSent) / timer.interval * timer.interval,
                    timer.MessageId);
                const message = await ArchiveChannel.messages.fetch(timer.MessageId.toString(), { force : true });
                const MessageData = await FormatData(await DataFromMessage(message));
                const channel = await StoryGuild.channels.fetch(timer.ChannelId.toString());
                await channel.send(MessageData);
            }
        }
        await sleep(100);
    }
}

async function FormatData(data) {
    if (typeof data == 'object')
        for (const key in data) data[key] = await FormatData(data[key]);
    if (typeof data == 'string') data = await FormatString(data);
    return data;
}

async function FormatString(str) {
    const res = str.split('`').join('\\`');
    return eval(`\`${res}\``);
}
