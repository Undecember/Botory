const { spawn } = require('child_process');
const fs = require('fs');
const { v4: uuid4 } = require('uuid');
const { db } = require('../db.js');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

var StoryGuild, BoostChannel, MemberChannel, RoleChannel, MemberRole;
function _setup(client) {
    stmt = db.prepare("SELECT id FROM channels WHERE key = ?");
    const BoostChannelId = stmt.get('BoosterCounter').id;
    const MemberChannelId = stmt.get('MemberCounter').id;
    const RoleChannelId = stmt.get('RoleCounter').id;
    const RankChannelId = stmt.get('rank').id;
    stmt = db.prepare("SELECT id FROM roles WHERE key = ?");
    const MemberRoleId = stmt.get('member').id;
    stmt = db.prepare("SELECT id FROM guilds WHERE key = ?");
    const StoryGuildId = stmt.get('story').id;
    client.guilds.fetch(StoryGuildId.toString()).then(async (guild) => {
        StoryGuild = guild;
        BoostChannel = await StoryGuild.channels.fetch(BoostChannelId.toString());
        MemberChannel = await StoryGuild.channels.fetch(MemberChannelId.toString());
        RoleChannel = await StoryGuild.channels.fetch(RoleChannelId.toString());
        RankChannel = await StoryGuild.channels.fetch(RankChannelId.toString());
        MemberRole = await StoryGuild.roles.fetch(MemberRoleId.toString());
        AutoCount(client);
    }).catch(console.error);
}

module.exports = { _setup };

async function AutoCount(client) {
    const { UpdateRole } = require('../submodules/Rank.js')
    while (true) {
        UpdateInGuild(client).then(() => {
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

async function UpdateInGuild(client) {
    igs = {};
    for (in_guild in [0, 1]) {
        stmt = db.prepare(`SELECT id, xp, in_guild FROM users
                WHERE in_guild = ${in_guild} ORDER BY xp DESC LIMIT 100`);
        for (row of stmt.all()) igs[row.id] = row.in_guild;
        stmt = db.prepare(`SELECT id, money, in_guild FROM users
                WHERE in_guild = ${in_guild} ORDER BY money DESC LIMIT 100`);
        for (row of stmt.all()) igs[row.id] = row.in_guild;
    }
    uin = [], uout = [];
    i = 0;
    for (id in igs) {
        in_guild = 0;
        try {
            await StoryGuild.members.fetch(id.toString());
            in_guild = 1;
        } catch { }
        if (in_guild) uin.push(id);
        else uout.push(id);
    }
    stmt = db.prepare("UPDATE users SET in_guild = ? WHERE id = ?");
    for (id of uin) stmt.run(1, id.toString());
    for (id of uout) stmt.run(0, id.toString());
}

async function UpdateStatus(client) {
    members = await StoryGuild.members.fetch();
    boosters = [], MemberCount = 0, AllCount = 0;
    for (data of members) {
        member = data[1];
        if (member.premiumSince != undefined) boosters.push(member);
        if (member.roles.resolve(MemberRole.id) != null) MemberCount++;
        AllCount++;
    }
    boostlevel = 0
    if (StoryGuild.premiumTier != 'NONE') boostlevel = StoryGuild.premiumTier.split('_').pop();
    await BoostChannel.edit({ name : `부스터 - ${boosters.length}명` });
    await MemberChannel.edit({ name : `전체 멤버 - ${AllCount} 명` });
    await RoleChannel.edit({ name : `정식 멤버 - ${MemberCount} 명` });
    request = { data : [] };
    for (booster of boosters) {
        avatar = booster.user.avatarURL();
        if (avatar === null) avatar = member.user.defaultAvatarURL;
        dat = { name : booster.displayName, avatarURL : avatar };
        request.data.push(dat);
    }
    ReqFileName = uuid4() + '.json'
    fs.writeFileSync(ReqFileName, JSON.stringify(request, null, 2));
    const pythonProcess = spawn('.venv/bin/python', ['./pkgs/Status.py', ReqFileName]);
    pythonProcess.stdout.on('data', async (data) => {
        data = data.toString();
        msgs = await BoostChannel.messages.fetch({ limit : 100 });
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
    for (pivot of ['XP', 'Money']) {
        request = await RequestTop(client, pivot);
        ReqFileName = uuid4() + '.json'
        fs.writeFileSync(ReqFileName, JSON.stringify(request, null, 2));
        pythonProcess = spawn('.venv/bin/python', [`./pkgs/${pivot}.py`, ReqFileName]);
        pythonProcess.stdout.on('data', async (data) => {
            data = data.toString();
            await RankChannel.send({ files: [data] });
            fs.unlinkSync(data);
            return;
        });
    }
}
