const { spawn } = require('child_process');
const fs = require('fs');
const { v4: uuid4 } = require('uuid');
const { db } = require('../db.js');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

var StoryGuild, RankChannel, DichRole, RichRole;
function _setup(client) {
    stmt = db.prepare('SELECT id FROM channels WHERE key = ?');
    const RankChannelId = stmt.get('rank').id;
    stmt = db.prepare('SELECT id FROM roles WHERE key = ?');
    const DichRoleId = stmt.get('dich').id;
    const RichRoleId = stmt.get('rich').id;
    stmt = db.prepare('SELECT id FROM guilds WHERE key = ?');
    client.guilds.fetch(stmt.get('story').id.toString()).then(async (guild) => {
        StoryGuild = guild;
        RankChannel = await StoryGuild.channels.fetch(RankChannelId.toString());
        RichRole = await StoryGuild.roles.fetch(RichRoleId.toString());
        DichRole = await StoryGuild.roles.fetch(DichRoleId.toString());
    });
    client.on('interactionCreate', async interaction => {
        if (!interaction.isCommand()) return;
        const { commandName } = interaction;
        if (commandName === 'rank') return await cmd_rank(interaction, 'XP');
        if (commandName === 'money') return await cmd_rank(interaction, 'Money');
    });
    client.on('messageCreate', messageXPnMoney);
}

module.exports = { _setup, RequestTop, UpdateRole };

async function cmd_rank(interaction, pivot) {
    id = interaction.options.getMember('user')?.id;
    if (id == null) id = interaction.user.id;
    request = await RequestFrame(interaction.client, StoryGuild, id, pivot);
    if (request == null) return await interaction.reply({ content: 'try later', ephemeral: true });
    ReqFileName = uuid4() + '.json'
    fs.writeFileSync(ReqFileName, JSON.stringify(request, null, 2));
    const pythonProcess = spawn('.venv/bin/python', [`./pkgs/${pivot}.py`, ReqFileName]);
    pythonProcess.stdout.on('data', async (data) => {
        data = data.toString();
        await interaction.reply({ files: [data], ephemeral: true });
        fs.unlinkSync(data);
    });
}

async function RequestTop(client, pivot) {
    data = [];
    const stmt = db.prepare(
        `SELECT id, ${pivot}, ` + 
            `RANK() OVER (ORDER BY ${pivot} DESC) _rank ` + 
        'FROM users WHERE in_guild = 1'
    );
    i = 0;
    for (const row of stmt.iterate()) {
        if (i > 19) break;
        dat = await RequestFrame(client, StoryGuild, row.id, pivot);
        if (dat != null) {
            data.push(dat);
            i++;
        }
    }
    return data;
}

async function RequestFrame(client, StoryGuild, id, pivot) {
    const stmt = db.prepare(
        `SELECT ${pivot}, _rank FROM ( ` +
            `SELECT id, ${pivot}, ` +
                `RANK() OVER (ORDER BY ${pivot} DESC) _rank ` +
            `FROM users WHERE in_guild = 1 ` +
        `) WHERE id = ?`
    );
    if (row == null) return null;
    try { member = await StoryGuild.members.fetch(id.toString()); }
    catch { return null; }
    avatar = member.user.avatarURL(true);
    if (avatar === null) avatar = member.user.defaultAvatarURL;
    row = stmt.get(id);
    res = { 'rank': row._rank.toString(), 'name': member.displayName, 'AvatarUrl': avatar };
    res[pivot] = row[pivot].toString();
    return res;
}

async function messageXPnMoney(message) {
    if (message.guild === undefined) return;
    if (message.author === undefined) return;
    if (message.guild?.id != StoryGuild.id) return;
    if (message.author.bot) return;
    id = message.author.id;
    stmt = db.prepare('SELECT LastChat FROM users WHERE id = ?');
    const dat = stmt.get(id);
    if (dat === undefined) {
        stmt = db.prepare('INSERT INTO users (id, xp, money, LastChat) VALUES (?, 20, 50, ?)');
        stmt.run(id, new Date().getTime());
        return;
    }
    flag = false;
    if (dat.LastChat == null) flag = true;
    if (!flag) flag = dat.LastChat + 1n * 60n * 1000n < new Date().getTime();
    if (flag) {
        stmt = db.prepare('UPDATE users SET xp = xp + 20, money = money + 50, LastChat = ? WHERE id = ?');
        stmt.run(new Date().getTime(), id);
    }
}

async function UpdateRole(client) {
    stmt = db.prepare('SELECT value FROM global WHERE key = ?');
    const RichPivot = stmt.get('RichPivot').value;
    const DichPivot = stmt.get('DichPivot').value;
    dichs = [], richs = [];
    stmt = db.prepare(
        `SELECT id, xp FROM users WHERE in_guild = 1 ORDER BY xp DESC LIMIT ${DichPivot}`
    );
    for (row of stmt.all()) dichs.push(row.id);
    stmt = db.prepare(
        `SELECT id, money FROM users WHERE in_guild = 1 ORDER BY money DESC LIMIT ${RichPivot}`
    );
    for (row of stmt.all()) richs.push(row.id);
    for (id of dichs) {
        try {
            member = await StoryGuild.members.fetch(id.toString());
            await member.roles.add(DichRole);
        } catch (e) { }
    }
    for (id of richs) {
        try {
            member = await StoryGuild.members.fetch(id.toString());
            await member.roles.add(RichRole);
        } catch (e) { console.error(e); }
    }
    return data;
}
