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
    for (const row of await SafeDB(stmt, 'all'))
        data.push(RequestFrame(client, row.id, pivot));
    return data;
}

async function RequestFrame(client, id, pivot) {
    try {
        let member = await StoryGuild.members.fetch(id.toString());
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
        const dat = SafeDB(stmt, 'get', id);
        if (dat === undefined) {
            stmt = `INSERT INTO users (id, xp, money, LastChat)
                VALUES (?, 20, 50, ?)`;
            return await SafeDB(stmt, 'run', id, new Date().getTime());
        }
        let flag = false;
        if (dat.LastChat == null) flag = true;
        if (!flag) flag = dat.LastChat + 1n * 60n * 1000n < new Date().getTime();
        if (flag) {
            stmt = `UPDATE users SET
                xp = xp + 20, money = money + 50, LastChat = ? WHERE id = ?`;
            await SafeDB(stmt, 'run', new Date().getTime(), id);
        }
    } catch (e) { console.error(e); }
}

async function UpdateRole(client) {
    try {
        let dichs = [], richs = [];
        stmt = `SELECT id, xp FROM users WHERE in_guild = 1
            ORDER BY xp DESC LIMIT ${DichPivot}`
        for (const row of await SafeDB(stmt, 'all')) dichs.push(row.id);
        stmt = `SELECT id, xp FROM users WHERE in_guild = 1
            ORDER BY money DESC LIMIT ${RichPivot}`
        for (const row of await SafeDB(stmt, 'all')) richs.push(row.id);
        for (const id of dichs) {
            try {
                let member = await StoryGuild.members.fetch(id.toString());
                await member.roles.add(DichRole);
            } catch (e) { console.error(e); }
        }
        for (const id of richs) {
            try {
                let member = await StoryGuild.members.fetch(id.toString());
                await member.roles.add(RichRole);
            } catch (e) { console.error(e); }
        }
    } catch (e) { console.error(e); }
}
