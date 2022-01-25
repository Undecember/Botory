const { db, sleep, SafeDB } = require('../db.js');
const { DataFromMessage } = require('./MessageManager.js');

var StoryGuild, OfficeChannel, ReportChannel, ModsRoleId;
async function _setup(client) {
    let stmt = 'SELECT id FROM guilds WHERE key = ?';
    const { id : StoryGuildId } = await SafeDB(stmt, 'get', 'story');
    StoryGuild = await client.guilds.fetch(StoryGuildId.toString());

    stmt = 'SELECT id FROM channels WHERE key = ?';
    const { id : ReportChannelId } = await SafeDB(stmt, 'get', 'report');
    const { id : OfficeChannelId } = await SafeDB(stmt, 'get', 'office');
    stmt = 'SELECT id FROM roles WHERE key = ?';
    ModsRoleId = (await SafeDB(stmt, 'get', 'mods')).id;
    ReportChannel = await StoryGuild.channels.fetch(ReportChannelId.toString());
    OfficeChannel = await StoryGuild.channels.fetch(OfficeChannelId.toString());

    client.on('interactionCreate', async interaction => {
        try { try {
            const { commandName } = interaction;
            if (commandName === 'report') return await cmd_report(interaction);
        } catch (e) {
            console.error(e);
            return await interaction.reply({ content: 'failed' });
        } } catch (e) { console.error(e); }
    });
    client.on('messageCreate', GetReport);
}

module.exports = { _setup };

async function cmd_report(interaction) {
    if (interaction.targetType == 'USER')
        await OfficeChannel.send({
            content: `<@&${ModsRoleId}>`,
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
        let message = await interaction.channel.messages.fetch(interaction.targetId);
        await OfficeChannel.send({
            content: `<@&${ModsRoleId}>`,
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
    try {
        if (message.channelId != ReportChannel.id) return;
        if (message.author.bot) return;
        const { files } = await DataFromMessage(message);
        await OfficeChannel.send({
            content: `<@&${ModsRoleId}>`,
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
    } catch (e) { console.error(e); }
}
