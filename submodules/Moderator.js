const { ops } = require('../config.json');
const { v4: uuid4 } = require('uuid');
const { db } = require('../db.js');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function uuid4hex() {
    buffer = Buffer.alloc(16);
    uuid4({}, buffer);
    return buffer.toString('hex');
}

var StoryGuild, BanCount, BanTime;
function _setup(client) {
    stmt = db.prepare('SELECT value FROM global WHERE key = ?');
    BanCount = stmt.get('BanCount').value;
    BanTime = stmt.get('BanTime').value;
    stmt = db.prepare('SELECT id FROM guilds WHERE key = ?');
    client.guilds.fetch(stmt.get('story').id.toString()).then(g => {StoryGuild = g;});
    client.on('interactionCreate', async interaction => {
        const { commandName } = interaction;
        if (commandName === 'ban') {
            if (interaction.isCommand())
                return await cmd_ban(interaction);
            if (interaction.isContextMenu())
                return await cmd_ban(interaction);
        }
    });
    client.on('interactionCreate', async interaction => {
        if (!interaction.isCommand()) return;
        const { commandName } = interaction;
        if (commandName === 'warn') return await cmd_warn(interaction);
        if (commandName === 'warns') return await cmd_warns(interaction);
        if (commandName === 'unwarn') return await cmd_unwarn(interaction);
    });
}

module.exports = { _setup };

async function cmd_ban(interaction) {
    UserId = null;
    if (interaction.isCommand()) UserId = interaction.options.getUser('user').id;
    if (interaction.isContextMenu()) UserId = interaction.targetId;
    try {
        reason = null;
        try { reason = interaction.options.getString('reason'); } catch {}
        return await interaction.reply(await ban(interaction.client, UserId, reason));
    } catch (e) {
        console.error(e);
        return await interaction.reply({ content: 'failed' });
    }
}

async function ban(client, UserId, reason) {
    user = await client.users.fetch(UserId);
    fields = []
    if (reason != null) fields = [{ name : '사유', value : reason }];
    try {
        DMChannel = await user.createDM();
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
    WarnId = interaction.options.getString('id');
    stmt = db.prepare(`SELECT id, ModeratorId FROM infractions WHERE id = ?`);
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
    UserId = interaction.options.getUser('user').id;
    reason = interaction.options.getString('reason');
    stmt = db.prepare(`INSERT INTO infractions
        (id, UserId, ModeratorId, reason, timecode) VALUES (?, ?, ?, ?, ?)`);
    flag = true;
    while (flag) {
        try {
            stmt.run(uuid4hex().slice(0, 10), UserId, interaction.user.id,
                reason, new Date().getTime());
            flag = false;
        } catch { }
        await sleep(50);
    }
    user = await interaction.client.users.fetch(UserId);
    fields = [];
    if (reason != null) fields.push();
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
    deadline = new Date().getTime() - BanTime;
    stmt = db.prepare(`SELECT id FROM infractions
        WHERE UserId = ? AND timecode > ? LIMIT 5`);
    if (stmt.all(UserId, deadline).length >= BanCount) {
        await interaction.channel.send(await ban(interaction.client, UserId, '경고 누적'));
    }
}

async function cmd_warns(interaction) {
    UserId = interaction.options.getUser('user').id;
    stmt = db.prepare(`SELECT id, reason, timecode FROM infractions
        WHERE UserId = ? ORDER BY timecode DESC LIMIT 5`);
    fields = [];
    for (infraction of stmt.all(UserId)) {
        timecode = infraction.timecode / 1000n;
        fields.push({
            name: `ID \`${infraction.id}\``,
            value: `사유 \`${infraction.reason}\`
                시각 <t:${timecode}:R>`
        });
    }
    user = await interaction.client.users.fetch(UserId);
    desc = '';
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
