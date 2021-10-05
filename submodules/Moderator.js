const { v4: uuid4 } = require('uuid');
const { db } = require('../db.js');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function uuid4hex() {
    buffer = Buffer.alloc(16);
    uuid4({}, buffer);
    return buffer.toString('hex');
}

var StoryGuild;
function _setup(client) {
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
    });
}

module.exports = { _setup };

async function cmd_ban(interaction) {
    UserId = null;
    if (interaction.isCommand()) UserId = interaction.options.getUser('user').id;
    if (interaction.isContextMenu()) UserId = interaction.targetId;
    try {
        user = await interaction.client.users.fetch(UserId);
        reason = null;
        try { reason = interaction.options.getString('reason'); } catch {}
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
        return await interaction.reply({
            embeds: [{
                title: 'RIP :zany_face:',
                description: `${user.username}#${user.discriminator}`,
                fields: fields
            }]
        });
    } catch (e) {
        console.error(e);
        return await interaction.reply({ content: 'failed' });
    }
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
    interaction.reply({
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
    interaction.reply({
        embeds: [{
            author: {
                name: `${user.username}#${user.discriminator}`,
                iconURL: user.displayAvatarURL()
            },
            fields: fields
        }]
    });
}
