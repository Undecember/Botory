const { db, sleep, SafeDB } = require('../db.js');

module.exports = { _setup };

BigInt.prototype.toJSON = function () {
    return this.toString();
};

async function _setup(client) {
    client.on('interactionCreate', async interaction => {
        try { try {
            const { commandName } = interaction;
            if (commandName === 'sql') return await cmd_sql(interaction);
        } catch (e) {
            await interaction.reply({ content: 'failed' });
            await interaction.channel.send({ content: e.toString() });
        } } catch (e) { console.error(e); }
    });
}

async function cmd_sql(interaction) {
    const cmd = interaction.options.getSubcommand();
    const query = interaction.options.getString('query');
    const result = await SafeDB(query, cmd);
    if (cmd == 'run') return interaction.reply('done');
    return interaction.reply({ content : JSON.stringify(result) });
}
