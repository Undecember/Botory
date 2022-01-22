const { db } = require('../db.js');
const { DataFromMessage } = require('./MessageManager.js');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

var StoryGuild, OfficeChannel, ReportChannel;
function _setup(client) {
    stmt = db.prepare("SELECT id FROM channels WHERE key = ?");
    const ReportChannelId = stmt.get('report').id;
    const OfficeChannelId = stmt.get('office').id;
    stmt = db.prepare('SELECT id FROM guilds WHERE key = ?');
    client.guilds.fetch(stmt.get('story').id.toString()).then(async guild => {
        StoryGuild = guild;
        ReportChannel = await StoryGuild.channels.fetch(ReportChannelId.toString());
        OfficeChannel = await StoryGuild.channels.fetch(OfficeChannelId.toString());
    });
    client.on('interactionCreate', async interaction => {
        const { commandName } = interaction;
        if (commandName === 'report') return await cmd_report(interaction);
    });
    client.on('messageCreate', GetReport);
}

module.exports = { _setup };

async function cmd_report(interaction) {
    if (interaction.targetType == 'USER')
        await OfficeChannel.send({
            embeds: [{
                title: '사용자 신고',
                author: {
                    name: `${interaction.user.username}#${interaction.user.discriminator}`,
                    iconURL: interaction.user.displayAvatarURL()
                },
                fields: [
                    {
                        name: '신고자 id',
                        value: `\`${interaction.user.id}\``
                    },
                    {
                        name: '신고대상 id',
                        value: `\`${interaction.targetId}\``
                    }
                ]
            }]
        });
    if (interaction.targetType == 'MESSAGE') {
        message = await interaction.channel.messages.fetch(interaction.targetId);
        await OfficeChannel.send({
            embeds: [{
                title: '메시지 신고',
                author: {
                    name: `${interaction.user.username}#${interaction.user.discriminator}`,
                    iconURL: interaction.user.displayAvatarURL()
                },
                fields: [
                    {
                        name: '신고자 id',
                        value: `\`${interaction.user.id}\``
                    },
                    {
                        name: '신고대상 메시지 id',
                        value: `\`${interaction.targetId}\``
                    },
                    {
                        name: '신고 대상 메시지',
                        value: `[바로가기](${message.url})`
                    }
                ]
            }]
        });
    }
    return await interaction.reply({ content : '신고되었습니다.', ephemeral : true });
}

async function GetReport(message) {
    if (message.channelId != ReportChannel.id) return;
    if (message.author.bot) return;
    const { files } = await DataFromMessage(message);
    await OfficeChannel.send({
        embeds: [{
            title: '신고',
            description: message.content,
            author: {
                name: `${message.author.username}#${message.author.discriminator}`,
                iconURL: message.author.displayAvatarURL()
            },
            fields: [{
                name: '신고자 id',
                value: `\`${message.author.id}\``
            }]
        }],
        files: files
    });
    await message.delete();
    message = await ReportChannel.send(`<@${message.author.id}> 신고되었습니다.`);
    await sleep(2000);
    await message.delete();
}
