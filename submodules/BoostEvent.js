const { db, sleep, SafeDB } = require('../db.js');

module.exports = { _setup };

var StoryGuild, StudioGuild, EmoteGuild;
async function _setup(client) {
    let stmt = 'SELECT id FROM guilds WHERE key = ?';
    const { id : StoryGuildId } = await SafeDB(stmt, 'get', 'story');
    const { id : StudioGuildId } = await SafeDB(stmt, 'get', 'studio');
    const { id : EmoteGuildId } = await SafeDB(stmt, 'get', 'emote');
    StoryGuild = await client.guilds.fetch(StoryGuildId.toString());
    StudioGuild = await client.guilds.fetch(StudioGuildId.toString());
    EmoteGuild = await client.guilds.fetch(EmoteGuildId.toString());

    AutoEvent(client);
}

async function AutoEvent(client) {
    while (true) {
        try {
            let rewards = {};
            let members = await StudioGuild.members.fetch();
            for (const data of members) {
                const member = data[1];
                if (member.premiumSince == null) continue;
                rewards[member.id] = 1;
            }
            members = await EmoteGuild.members.fetch();
            for (const data of members) {
                const member = data[1];
                if (member.premiumSince == null) continue;
                if (!(member.id in rewards)) rewards[member.id] = 0;
                rewards[member.id]++;
            }
            for (const id in rewards) {
                try {
                    const member = await StoryGuild.members.fetch(id);
                    if (member.premiumSince) continue;
                } catch { }
                rewards[id] = 0;
            }
            const prev = await SafeDB('SELECT id, event FROM users WHERE event > 0', 'all');
            for (const row of prev) {
                if (!(row.id.toString() in rewards)) rewards[row.id.toString()] = 0;
                rewards[row.id.toString()] -= Number(row.event);
            }
            const stmt = 'UPDATE users SET money = money + ?, event = event + ? WHERE id = ?';
            for (const id in rewards) if (rewards[id]) {
                try {
                    await SafeDB(stmt, 'run', rewards[id] * 3000000, rewards[id], id);
                } catch (e) { console.error(e); }
            }
        } catch (e) { console.error(e); }
        await sleep(10 * 60 * 1000);
    }
}
