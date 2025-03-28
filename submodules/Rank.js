const { spawn } = require('child_process');
const fs = require('fs');
const { v4: uuid4 } = require('uuid');
const { db, sleep, SafeDB } = require('../db.js');
const { UpdateInGuild } = require('./Status.js');

module.exports = { _setup, RequestTop, UpdateRole };

var StoryGuild, RankChannel, DichRole, RichRole, DichPivot, RichPivot;
async function _setup(client) {
    let stmt = 'SELECT id FROM guilds WHERE key = ?';
    const { id : StoryGuildId } = await SafeDB(stmt, 'get', 'story');
    StoryGuild = await client.guilds.fetch(StoryGuildId.toString());

    stmt = 'SELECT id FROM channels WHERE key = ?';
    const { id : RankChannelId } = await SafeDB(stmt, 'get', 'rank');
    stmt = 'SELECT id FROM roles WHERE key = ?';
    const { id : DichRoleId } = await SafeDB(stmt, 'get', 'dich');
    const { id : RichRoleId } = await SafeDB(stmt, 'get', 'rich');
    stmt = 'SELECT value FROM global WHERE key = ?';
    RichPivot = (await SafeDB(stmt, 'get', 'RichPivot')).value;
    DichPivot = (await SafeDB(stmt, 'get', 'DichPivot')).value;
    RankChannel = await StoryGuild.channels.fetch(RankChannelId.toString());
    RichRole = await StoryGuild.roles.fetch(RichRoleId.toString());
    DichRole = await StoryGuild.roles.fetch(DichRoleId.toString());

    client.on('interactionCreate', async interaction => {
        try { try {
            if (!interaction.isCommand()) return;
            const { commandName } = interaction;
            if (commandName === 'rank') return await cmd_rank(interaction, 'XP');
            if (commandName === 'money') return await cmd_rank(interaction, 'Money');
        } catch (e) {
            console.error(e);
            return await interaction.reply({ content: 'failed' });
        } } catch (e) { console.error(e); }
    });
    client.on('messageCreate', messageXPnMoney);
}

async function cmd_rank(interaction, pivot) {
    let id = interaction.options.getMember('user')?.id;
    if (id == null) id = interaction.user.id;
    let request = await RequestFrame(interaction.client, id, pivot);
    let ReqFileName = uuid4() + '.json'
    fs.writeFileSync(ReqFileName, JSON.stringify(request, null, 2));
    const pythonProcess = spawn(
        '.venv/bin/python', [`./pkgs/${pivot}.py`, ReqFileName]);
    pythonProcess.stdout.on('data', async (data) => {
        data = data.toString();
        await interaction.reply({ files: [data], ephemeral: true });
        fs.unlinkSync(data);
    });
}

async function RequestTop(client, pivot) {
    let data = [];
    const stmt = `SELECT id, ${pivot},
        RANK() OVER (ORDER BY ${pivot} DESC) _rank
        FROM users WHERE in_guild = 1 LIMIT 20`;
    for (const row of await SafeDB(stmt, 'all')) {
        const frame = await RequestFrame(client, row.id, pivot);
        if (frame != null) data.push(frame);
    }
    return data;
}

async function RequestFrame(client, id, pivot) {
    try {
        let member = null;
        try {
            member = await StoryGuild.members.fetch(id.toString());
        } catch { return null; }
        await UpdateInGuild(client, id);
        stmt = `SELECT ${pivot}, _rank FROM (
            SELECT id, ${pivot},
                RANK() OVER (ORDER BY ${pivot} DESC) _rank
            FROM users WHERE in_guild = 1
        ) WHERE id = ?`;
        let row = await SafeDB(stmt, 'get', id);
        let res = {
            'rank': row._rank.toString(),
            'name': member.displayName,
            'AvatarUrl': await member.user.displayAvatarURL() };
        res[pivot] = row[pivot].toString();
        return res;
    } catch (e) { console.error(e); }
}

async function messageXPnMoney(message) {
    try {
        if (message.guild === undefined) return;
        if (message.author === undefined) return;
        if (message.guild?.id != StoryGuild.id) return;
        if (message.author.bot) return;
        let id = message.author.id;
        await UpdateInGuild(message.client, id);
        let stmt = 'SELECT LastChat FROM users WHERE id = ?';
        const dat = await SafeDB(stmt, 'get', id);
        if (dat === undefined) {
            stmt = `INSERT INTO users (id, xp, money, LastChat)
                VALUES (?, 20, 50, ?)`;
            return await SafeDB(stmt, 'run', id, Date.now());
        }
        let flag = false;
        if (dat.LastChat == null) flag = true;
        if (!flag) flag = dat.LastChat + 1n * 60n * 1000n < Date.now();
        if (flag) {
            stmt = `UPDATE users SET
                xp = xp + 20, money = money + 50, LastChat = ? WHERE id = ?`;
            await SafeDB(stmt, 'run', Date.now(), id);
        }
    } catch (e) { console.error(e); }
}

async function UpdateRole(client) {
    try {
        for (const type of ['xp', 'money']) {
            let pivot = RichPivot;
            let role = RichRole;
            if (type == 'xp') {
                pivot = DichPivot;
                role = DichRole;
            }
            let diffs = {};
            const members = [];
            for (const item of await StoryGuild.members.fetch())
                members.push(item[1]);
            for (const member of members) {
                if (member.roles.cache.has(role.id)) diffs[member.id] = -1;
            }
            const stmt = `SELECT id, ${type} FROM users WHERE in_guild = 1
                ORDER BY ${type} DESC LIMIT ${pivot}`
            for (const row of await SafeDB(stmt, 'all')) {
                const id = row.id.toString();
                if (id in diffs) diffs[id] = 0;
                else diffs[id] = 1;
            }
            for (const id in diffs) if (diffs[id] != 0) {
                member = await StoryGuild.members.fetch(id);
                if (diffs[id] < 0) await member.roles.remove(role);
                else await member.roles.add(role);
            }
        }
    } catch (e) { console.error(e); }
}
