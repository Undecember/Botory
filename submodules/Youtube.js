const { db, sleep, SafeDB } = require('../db.js');
const YTN = require('youtube-notification');

module.exports = { _setup };

var StoryGuild, YoutubeChannel;
async function _setup(client) {
    let stmt = 'SELECT id FROM guilds WHERE key = ?';
    const { id : StoryGuildId } = await SafeDB(stmt, 'get', 'story');
    StoryGuild = await client.guilds.fetch(StoryGuildId.toString());

    stmt = 'SELECT id FROM channels WHERE key = ?';
    const { id : YoutubeChannelId } = await SafeDB(stmt, 'get', 'youtube');
    stmt = 'SELECT id FROM YoutubeChannels';
    let YoutubeChannels = [];
    for (const row of await SafeDB(stmt, 'all'))
        YoutubeChannels.push(row.id);
    YoutubeChannel = await StoryGuild.channels.fetch(YoutubeChannelId);
    const notifier = new YTN({
        hubCallback: 'https://undec-lt.loca.lt',
        port: 12344,
    });
    notifier.setup();
    notifier.subscribe(YoutubeChannels);
    notifier.on('notified', async data => {
        try {
            if (YoutubeChannels.includes(data.channel.id)) {
                const stmt = 'INSERT INTO YoutubeVideos (id) VALUES (?)';
                if (await SafeDB(stmt, 'run', data.video.id) != undefined)
                    await Notify(data.video.id);
            } else notifier.unsubscribe(data.channel.id);
        } catch (e) { console.error(e); }
    });
}

module.exports = { _setup };

async function Notify(VideoId) {
    try {
        const message = await YoutubeChannel.send(
            `새로운 영상이 올라왔어요!\nhttps://youtu.be/${VideoId}`);
        await message.react('👍');
        await message.react('👎');
        await message.crosspost();
    } catch (e) { console.error(e); }
}
