const Database = require('better-sqlite3');
const db = new Database('DB.db');
const assert = require('assert');

module.exports = { db, builddb, sleep, SafeDB };

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function builddb() {
    db.defaultSafeIntegers();
    process.on('exit', () => db.close());
    process.on('SIGHUP', () => process.exit(128 + 1));
    process.on('SIGINT', () => process.exit(128 + 2));
    process.on('SIGTERM', () => process.exit(128 + 15));
}

const types = ['run', 'get', 'all'];
async function SafeDB(stmt, type) {
    assert(types.indexOf(type) >= 0);
    let cnt = 0;
    let args = Array.from(arguments).slice(2);
    while (true) {
        try {
            let _stmt = db.prepare(stmt);
            if (type == 'run') return _stmt.run(...args);
            if (type == 'get') return _stmt.get(...args);
            if (type == 'all') return _stmt.all(...args);
        } catch (e) {
            if (++cnt > 20) return console.error(`SafeDB.${type} failed.\n${e}`);
            await sleep(50);
        }
    }
}
