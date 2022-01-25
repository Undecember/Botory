const { spawn } = require('child_process');
const fs = require('fs');
const { v4: uuid4 } = require('uuid');
const { db, sleep, SafeDB } = require('../db.js');

module.exports = { _setup, UpdateInGuild };

var StoryGuild, BoostChannel, MemberChannel, RoleChannel, MemberRole;
async function _setup(client) {
    let stmt = 'SELECT id FROM guilds WHERE key = ?';
    const { id : StoryGuildId } = await SafeDB(stmt, 'get', 'story');
    StoryGuild = await client.guilds.fetch(StoryGuildId.toString());

    stmt = 'SELECT id FROM channels WHERE key = ?';
    const { id : BoostChannelId } = await SafeDB(stmt, 'get', 'BoosterCounter');
    const { id : MemberChannelId } = await SafeDB(stmt, 'get', 'MemberCounter');
    const { id : RoleChannelId } = await SafeDB(stmt, 'get', 'RoleCounter');
    const { id : RankChannelId } = await SafeDB(stmt, 'get', 'rank');
    stmt = 'SELECT id FROM roles WHERE key = ?';
    const { id : MemberRoleId } = await SafeDB(stmt, 'get', 'member');
    BoostChannel = await StoryGuild.channels.fetch(BoostChannelId.toString());
    MemberChannel = await StoryGuild.channels.fetch(MemberChannelId.toString());
    RoleChannel = await StoryGuild.channels.fetch(RoleChannelId.toString());
    RankChannel = await StoryGuild.channels.fetch(RankChannelId.toString());
    MemberRole = await StoryGuild.roles.fetch(MemberRoleId.toString());

    AutoCount(client);
}

async function AutoCount(client) {
    const { UpdateRole } = require('../submodules/Rank.js')
    while (true) {
        TopUpdateInGuild(client).then(() => {
            UpdateStatus(client);
            RankChannel.messages.fetch({ limit : 100 }).then(msgs => {
                RankChannel.bulkDelete(msgs);
                UpdateRank(client);
                UpdateRole(client);
            })
        }).catch(console.error);
        await sleep(10 * 60 * 1000);
    }
}

async function UpdateInGuild(client, id) {
    try {
        let stmt = 'UPDATE users SET in_guild = ? WHERE id = ?';
        try {
            await StoryGuild.members.fetch(id.toString());
            await SafeDB(stmt, 'run', 1, id);
        } catch { await SafeDB(stmt, 'run', 0, id); }
    } catch (e) { console.error(e); }
}

async function TopUpdateInGuild(client) {
    let ids = new Set();
    for (const pivot of ['xp', 'money']) {
        const stmt = `SELECT id, ${pivot} FROM users
            WHERE in_guild = 1 ORDER BY ${pivot} DESC LIMIT 100`;
        for (const row of await SafeDB(stmt, 'all')) ids.add(row.id);
    }
    for (const id of ids) await UpdateInGuild(client, id);
}

async function UpdateStatus(client) {
    let members = await StoryGuild.members.fetch();
    let boosters = [], MemberCount = 0, AllCount = 0;
    for (const data of members) {
        const member = data[1];
        if (member.premiumSince != undefined) boosters.push(member);
        if (member.roles.resolve(MemberRole.id) != null) MemberCount++;
        AllCount++;
    }
    let boostlevel = 0
    if (StoryGuild.premiumTier != 'NONE') boostlevel = StoryGuild.premiumTier.split('_').pop();
    await BoostChannel.edit({ name : `부스터 - ${boosters.length}명` });
    await MemberChannel.edit({ name : `전체 멤버 - ${AllCount} 명` });
    await RoleChannel.edit({ name : `정식 멤버 - ${MemberCount} 명` });
    let request = { data : [] };
    for (const booster of boosters) {
        const avatar = booster.user.avatarURL();
        if (avatar === null) avatar = member.user.defaultAvatarURL;
        const dat = { name : booster.displayName, avatarURL : avatar };
        request.data.push(dat);
    }
    const ReqFileName = uuid4() + '.json'
    fs.writeFileSync(ReqFileName, JSON.stringify(request, null, 2));
    const pythonProcess = spawn('.venv/bin/python', ['./pkgs/Status.py', ReqFileName]);
    pythonProcess.stdout.on('data', async (data) => {
        data = data.toString();
        const msgs = await BoostChannel.messages.fetch({ limit : 100 });
        try { await BoostChannel.bulkDelete(msgs); } catch {}
        if (data === 'none') {
            try { await BoostChannel.send('부스터가 없습니다ㅠㅠ'); } catch {}
            return;
        }
        const { images } = require(data);
        await BoostChannel.send({ files : images });
        fs.unlinkSync(data.slice(1));
        for (image of images) fs.unlinkSync(image);
        return;
    });
}

async function UpdateRank(client) {
    const { RequestTop } = require('../submodules/Rank.js')
    for (const pivot of ['XP', 'Money']) {
        const request = await RequestTop(client, pivot);
        const ReqFileName = uuid4() + '.json'
        fs.writeFileSync(ReqFileName, JSON.stringify(request, null, 2));
        const pythonProcess = spawn(
            '.venv/bin/python', [`./pkgs/${pivot}.py`, ReqFileName]);
        pythonProcess.stdout.on('data', async (data) => {
            data = data.toString();
            await RankChannel.send({ files: [data] });
            fs.unlinkSync(data);
            return;
        });
    }
}
