const { db, sleep, SafeDB } = require('../db.js');

module.exports = { _setup };

async function _setup(client) {
    client.on('interactionCreate', async interaction => {
        try { try {
            const { commandName } = interaction;
            if (commandName === 'give') return await cmd_give(interaction);
        } catch (e) {
            console.error(e);
            await interaction.reply({ content: 'failed' });
        } } catch (e) { console.error(e); }
    });
}

async function cmd_give(interaction) {
    let type = interaction.options.getSubcommand();
    let value = interaction.options.getInteger('value');
    const user = interaction.options.getUser('user');
    let stmt = `SELECT ${type} FROM users WHERE id = ?`;
    const origin = Number((await SafeDB(stmt, 'get', user.id))[type]);
    if (origin + value < 0) value = -origin;
    stmt = `UPDATE users SET ${type} = ${type} + ? WHERE id = ?`;
    await SafeDB(stmt, 'run', value, user.id);
    if (type != 'xp') type = '도토리';
    if (value < 0) return interaction.reply({ embeds: [{
        description: `<@${user.id}>님에게서 ${-value}${type}가 제거되었습니다.`
    }] });
    return interaction.reply({ embeds: [{
        description: `<@${user.id}>님에게 ${value}${type}가 지급되었습니다.`
    }] });
}
