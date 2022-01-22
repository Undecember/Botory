const { db } = require('../db.js');
const YTN = require('youtube-notification');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

var StoryGuild, YoutubeChannel;
function _setup(client) {
    let stmt = db.prepare("SELECT id FROM guilds WHERE key = ?");
    const StoryGuildId = stmt.get('story').id;
    stmt = db.prepare("SELECT id FROM channels WHERE key = ?");
    const YoutubeChannelId = stmt.get('youtube').id;
    stmt = db.prepare("SELECT id FROM YoutubeChannels");
    let YoutubeChannels = [];
    for (const YoutubeChannelId of stmt.iterate()) {
        YoutubeChannels.push(YoutubeChannelId.id);
    }
    client.guilds.fetch(StoryGuildId.toString()).then(async (guild) => {
        StoryGuild = guild;
        YoutubeChannel = await StoryGuild.channels.fetch(YoutubeChannelId);
        const notifier = new YTN({
            hubCallback: 'https://undec-lt.loca.lt',
            port: 12344,
        });
        notifier.setup();
        notifier.subscribe(YoutubeChannels);
        notifier.on('notified', data => {
            if (YoutubeChannels.includes(data.channel.id)) {
                YoutubeChannel.send(`${data.video.link}\n새로운 영상이 올라왔어요!`)
                    .then(msg => {
                        msg.react('👍').then(() => {msg.react('👎');});
                    }).catch(console.error);
            } else notifier.unsubscribe(data.channel.id);
        });
    });
}

module.exports = { _setup };
