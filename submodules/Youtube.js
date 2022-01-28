const { db, sleep, SafeDB } = require('../db.js');
const YTN = require('youtube-notification');

module.exports = { _setup };

var StoryGuild, YoutubeChannel, queue = [];
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
            if (YoutubeChannels.includes(data.channel.id))
                queue.push(data.video.link);
            else notifier.unsubscribe(data.channel.id);
        } catch (e) { console.error(e); }
    });
    AutoNotify();
}

module.exports = { _setup };

async function AutoNotify() {
    let vids = new Set(), flag = new Date().getTime();
    while (true) {
        if (queue.length != 0)
            try {
                link = queue[0];
                queue.shift();
                if (vids.has(link)) continue;
                vids.add(link);
                const message = await YoutubeChannel.send(
                    `${link}\n새로운 영상이 올라왔어요!`);
                await message.react('👍');
                await message.react('👎');
            } catch (e) { console.error(e); }
        else if (new Date().getTime() - flag > 5 * 60 * 1000) {
            vids.clear();
            flag = new Date().getTime();
        }
        await sleep(50);
    }
}
