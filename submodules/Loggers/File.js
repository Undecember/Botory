const { db, sleep, SafeDB } = require('../../db.js');

module.exports = { _setup };

var StoryGuild, FileChannel;
async function _setup(client) {
    let stmt = 'SELECT id FROM guilds WHERE key = ?';
    const { id : StoryGuildId } = await SafeDB(stmt, 'get', 'story');
    StoryGuild = await client.guilds.fetch(StoryGuildId.toString());

    stmt = 'SELECT id FROM channels WHERE key = ?';
    const { id : FileChannelId } = await SafeDB(stmt, 'get', 'file');
    FileChannel = await StoryGuild.channels.fetch(FileChannelId.toString());

    client.on('messageCreate', LogFile);
}

async function LogFile(message) {
    try {
        if (message.guild?.id != StoryGuild.id) return;
        if (message.author.bot) return;
        if (message.attachments.size == 0) return;
        let files = []
        for (data of message.attachments) files.push(data[1].url);
        await FileChannel.send({
            files: files,
            embeds: [{
                author: {
                    name: `${message.author.username}#${message.author.discriminator}`,
                    iconURL: message.author.displayAvatarURL()
                },
                description: `Attachment from [a message](${message.url})`
                    + ` in <#${message.channelId}>`,
                fields: [
                    {
                        name: 'User ID',
                        value: message.author.id,
                        inline: false
                    },
                    {
                        name: 'Message ID',
                        value: message.id
                    }
                ]
            }]
        });
    } catch (e) { console.error(e); }
}
