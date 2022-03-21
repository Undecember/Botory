const { db, sleep, SafeDB } = require('../db.js');
const { submodules } = require('./Loggers/config.json');

module.exports = { _setup };

var StoryGuild;
async function _setup(client) {
    let stmt = 'SELECT id FROM guilds WHERE key = ?';
    const { id : StoryGuildId } = await SafeDB(stmt, 'get', 'story');
    StoryGuild = await client.guilds.fetch(StoryGuildId.toString());

    for (const submodule of submodules) {
        const { _setup : __setup } = require('./Loggers/' + submodule + '.js');
        __setup(client);
    }
    AutoAudit();
}

async function AutoAudit() {
    let LastAuditLogId = null;
    for (const item of (await StoryGuild.fetchAuditLogs({ limit : 1 })).entries) {
        LastAuditLogId = item[0];
    }
    while (true) {
        try {
            let flag = true, AuditLogs = [];
            while (flag) {
                const FetchedLogs = await StoryGuild.fetchAuditLogs({ limit : 10 });
                for (const item of FetchedLogs.entries) {
                    const id = item[0], entry = item[1];
                    if (id == LastAuditLogId) {
                        flag = false;
                        break;
                    }
                    AuditLogs.push(entry);
                }
            }
            if (AuditLogs.length) LastAuditLogId = AuditLogs[0].id;
            for (const al of AuditLogs) try {
                await CallAuditLogger(al);
            } catch (e) { console.error(e); }
        } catch (e) { console.error(e); }
        await sleep(5 * 1000);
    }
}

async function CallAuditLogger(AuditLog) {
    const type = AuditLog.action
}
