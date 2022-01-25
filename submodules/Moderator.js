const { ops } = require('../config.json');
const { v4: uuid4 } = require('uuid');
const { db, sleep, SafeDB } = require('../db.js');

module.exports = { _setup };

function uuid4hex() {
    let buffer = Buffer.alloc(16);
    uuid4({}, buffer);
    return buffer.toString('hex');
}

var StoryGuild, BanCount, BanTime, MuteRole;
async function _setup(client) {
    let stmt = 'SELECT id FROM guilds WHERE key = ?';
    const { id : StoryGuildId } = await SafeDB(stmt, 'get', 'story');
    StoryGuild = await client.guilds.fetch(StoryGuildId.toString());

    stmt = 'SELECT value FROM global WHERE key = ?';
    BanCount = (await SafeDB(stmt, 'get', 'BanCount')).value;
    BanTime = (await SafeDB(stmt, 'get', 'BanTime')).value;
    stmt = 'SELECT id FROM roles WHERE key = ?';
    const { id : MuteRoleId } = await SafeDB(stmt, 'get', 'mute');
    MuteRole = await StoryGuild.roles.fetch(MuteRoleId.toString());

    client.on('interactionCreate', async interaction => {
        try { try {
            const { commandName } = interaction;
            if (commandName === 'delete') return await cmd_delete(interaction);
            if (commandName === 'ban') return await cmd_ban(interaction);
            if (commandName === 'mute') return await cmd_mute(interaction);
            if (commandName === 'unmute') return await cmd_unmute(interaction);
            if (commandName === 'warn') return await cmd_warn(interaction);
            if (commandName === 'warns') return await cmd_warns(interaction);
            if (commandName === 'unwarn') return await cmd_unwarn(interaction);
        } catch (e) {
            console.error(e);
            return await interaction.reply({ content: 'failed' });
        } } catch (e) { console.error(e); }
    });
}

async function cmd_delete(interaction) {
    let message = await interaction.channel.messages.fetch(interaction.targetId);
    await message.delete();
    return await interaction.reply({ content : '삭제되었습니다.', ephemeral : true });
}

async function cmd_mute(interaction) {
    let UserId = null;
    if (interaction.isCommand()) UserId = interaction.options.getUser('user').id;
    if (interaction.isContextMenu()) UserId = interaction.targetId;
    if (ops.indexOf(UserId.toString()) >= 0)
        return await interaction.reply({
            embeds: [{ description: '운영자를 뮤트할 수 없습니다.' }]
        });
    let member = await StoryGuild.members.fetch(UserId);
    await member.roles.add(MuteRole);
    return await interaction.reply({
        embeds: [{
            author: {
                name: `${member.user.username}#${member.user.discriminator}`,
                iconURL: member.user.displayAvatarURL()
            },
            title: '뮤트'
        }]
    });
}

async function cmd_unmute(interaction) {
    let UserId = interaction.options.getUser('user').id;
    let member = await StoryGuild.members.fetch(UserId);
    await member.roles.remove(MuteRole);
    return await interaction.reply({ content: '뮤트 해제되었습니다.' });
}

async function cmd_ban(interaction) {
    let UserId = null;
    if (interaction.isCommand()) UserId = interaction.options.getUser('user').id;
    if (interaction.isContextMenu()) UserId = interaction.targetId;
    if (ops.indexOf(UserId.toString()) >= 0)
        return await interaction.reply({
            embeds: [{ description: '운영자를 밴할 수 없습니다.' }]
        });
    let reason = null;
    try { reason = interaction.options.getString('reason'); } catch {}
    return await interaction.reply(await ban(interaction.client, UserId, reason));
}

async function ban(client, UserId, reason) {
    let user = await client.users.fetch(UserId);
    let fields = []
    if (reason != null) fields = [{ name : '사유', value : reason }];
    try {
        let DMChannel = await user.createDM();
        await DMChannel.send({
            embeds: [{
                title: 'RIP :zany_face:',
                description: '당신은 The Stories 서버에서 밴되셨습니다.',
                fields: fields
            }]
        });
    } catch {}
    await StoryGuild.bans.create(user, { days : 7, reason : reason });
    return {
        embeds: [{
            title: 'RIP :zany_face:',
            description: `${user.username}#${user.discriminator}`,
            fields: fields
        }]
    };
}

async function cmd_unwarn(interaction) {
    let WarnId = interaction.options.getString('id');
    let stmt = db.prepare(`SELECT id, ModeratorId FROM infractions WHERE id = ?`);
    if (stmt.all(WarnId).length == 0)
        return await interaction.reply({
            embeds: [{
                description: '존재하지 않는 id입니다.',
            }]
        });
    if (stmt.get(WarnId).ModeratorId != interaction.user.id
        && ops.indexOf(interaction.user.id) < 0)
        return await interaction.reply({
            embeds: [{
                description: '삭제할 권한이 없습니다.',
            }]
        });
    stmt = db.prepare("DELETE FROM infractions WHERE id = ?");
    stmt.run(WarnId);
    return await interaction.reply({
        embeds: [{
            description: '경고가 삭제되었습니다.',
        }]
    });
}

async function cmd_warn(interaction) {
    let UserId = interaction.options.getUser('user').id;
    if (ops.indexOf(UserId.toString()) >= 0)
        return await interaction.reply({
            embeds: [{ description: '운영자를 경고할 수 없습니다.' }]
        });
    let reason = interaction.options.getString('reason');
    let stmt = `INSERT INTO infractions (id, UserId, ModeratorId, reason, timecode)
        VALUES (?, ?, ?, ?, ?)`;
    await SafeDB(stmt, 'run',
        uuid4hex().slice(0, 10),
        UserId,
        interaction.user.id,
        reason,
        new Date().getTime());
    let user = await interaction.client.users.fetch(UserId);
    let fields = [];
    await interaction.reply({
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
    let deadline = new Date().getTime() - BanTime;
    stmt = `SELECT id FROM infractions WHERE UserId = ? AND timecode > ? LIMIT 5`;
    if ((await SafeDB(stmt, 'all', UserId, deadline)).length >= BanCount)
        await interaction.channel.send(
            await ban(interaction.client, UserId, '경고 누적'));
}

async function cmd_warns(interaction) {
    let UserId = interaction.options.getUser('user').id;
    let stmt = `SELECT id, reason, timecode FROM infractions
        WHERE UserId = ? ORDER BY timecode DESC LIMIT 5`;
    let fields = [];
    for (const infraction of await SafeDB(stmt, 'all', UserId)) {
        let timecode = infraction.timecode / 1000n;
        fields.push({
            name: `ID \`${infraction.id}\``,
            value: `사유 \`${infraction.reason}\`
                시각 <t:${timecode}:R>`
        });
    }
    let user = await interaction.client.users.fetch(UserId);
    let desc = '';
    if (fields.length == 0) desc = '경고가 없습니다.';
    await interaction.reply({
        embeds: [{
            author: {
                name: `${user.username}#${user.discriminator}`,
                iconURL: user.displayAvatarURL()
            },
            description: desc,
            fields: fields
        }]
    });
}
