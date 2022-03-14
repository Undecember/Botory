const { db, sleep, SafeDB } = require('../db.js');
const { submodules } = require('./Loggers/config.json');

module.exports = { _setup };

async function _setup(client) {
    for (const submodule of submodules) {
        const { _setup : __setup } = require('./Loggers/' + submodule + '.js');
        __setup(client);
    }
}
