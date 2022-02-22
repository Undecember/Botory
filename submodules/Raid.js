const { v4: uuid4 } = require('uuid');
const { db, sleep, SafeDB } = require('../db.js');
const { MessageActionRow, MessageButton, MessageEmbed } = require('discord.js');

var StoryGuild, RaidChannel;
async function _setup(client) {
    let stmt = 'SELECT id FROM guilds WHERE key = ?';
    const { id : StoryGuildId } = await SafeDB(stmt, 'get', 'story');
    StoryGuild = await client.guilds.fetch(StoryGuildId.toString());

    stmt = 'SELECT id FROM channels WHERE key = ?';
    const { id : RaidChannelId } = await SafeDB(stmt, 'get', 'raid');
    stmt = 'SELECT id FROM guilds WHERE key = ?';
    RaidChannel = await StoryGuild.channels.fetch(RaidChannelId.toString());

    AutoRaidMsg(client);
    client.on('interactionCreate', async interaction => {
        try { try {
            if (!interaction.isCommand()) return;
            const { commandName } = interaction;
            if (commandName === 'goraid') return await cmd_goraid(interaction);
        } catch (e) {
            console.error(e);
            return await interaction.reply({ content: 'failed' });
        } } catch (e) { console.error(e); }
    });
}

module.exports = { _setup };

var killflag = false, ForcePrice;
async function cmd_goraid(interaction) {
    ForcePrice = interaction.options.getInteger('price');
    await interaction.reply({ content: `Go Raid ${ForcePrice}!`, ephemeral: true });
    killflag = true;
}

async function AutoRaidMsg(client) {
    while (true) {
        let timeflag = Date.now();
        try {
            if (Math.random() * 10 < 1 || killflag) {
                let price = null;
                if (killflag) {
                    price = ForcePrice;
                    killflag = false;
                }
                if (price == null) {
                    const stmt = 'SELECT value FROM global WHERE key = ?';
                    const { value : LastRaid } = await SafeDB(
                        stmt, 'get', 'LastRaid');
                    price = Math.floor(Number(BigInt(timeflag) - LastRaid) / 900);
                    if (LastRaid < 0 || price < 2000) price = 2000;
                }
                let embed = new MessageEmbed()
                    .setTitle('도토리 레이드 도착!')
                    .setDescription(
                        `15초 안에 아래 버튼을 눌러서 도토리 ${price}개를 받으세요!`);
                let CID = uuid4();
                let ActionRow = new MessageActionRow()
                    .addComponents(
                        new MessageButton()
                            .setCustomId(CID)
                            .setLabel('레이드 받기')
                            .setStyle('PRIMARY'));
                let raiders = new Set();
                let listener = async (interaction) => {
                    try { try {
                        if (!interaction.isButton()) return;
                        if (interaction.component.customId != CID) return;
                        if (!await CheckActive(interaction.user, beforeMsgs)) return await interaction.reply({
                            content: '최근 활동이 없어 참가 거부되었습니다.', ephemeral: true });
                        if (raiders.has(interaction.user.id))
                            await interaction.reply({ content: '이미 참가하셨습니다.', ephemeral: true });
                        else {
                            raiders.add(interaction.user.id);
                            await interaction.reply({ content: '레이드 참가되었습니다.', ephemeral: true });
                        }
                    } catch (e) {
                        console.error(e);
                        return await interaction.reply({ content: 'failed' });
                    } } catch (e) { console.error(e); }
                };
                client.on('interactionCreate', listener);
                let RaidMsg = await RaidChannel.send({ embeds: [embed], components: [ActionRow] });
                let beforeMsgs = await RaidChannel.messages.fetch({ before: RaidMsg.id, limit: 100 });
                await sleep(15 * 1000);
                client.removeListener('interactionCreate', listener);
                embed = await GenRaidEmbed(raiders, price);
                await RaidMsg.edit({ embeds: [embed], components: [] });
                await SafeDB('UPDATE global SET value = ? WHERE key = ?',
                    'run', timeflag, 'LastRaid');
            }
        } catch (e) { console.error(e); }
        while (Date.now() - timeflag < 3 * 60 * 1000 && !killflag) await sleep(100);
    }
}

async function CheckActive(user, msgs) {
    let chk = msgs.filter(m => m.author.id == user.id);
    if (chk.size == 0) return false;
    return Date.now() - chk.first().createdAt < 5 * 60 * 1000;
}

async function GenRaidEmbed(_raiders, price) {
    _raiders = Array.from(_raiders);
    let raiders = [];
    for (const id of _raiders) {
        try {
            raider = await StoryGuild.members.fetch(id);
            raiders.push(raider);
        } catch {}
    }
    raiders = shuffle(raiders);
    let embed = new MessageEmbed().setTitle('도토리 레이드 마감~~!');
    if (raiders.length == 0) {
        if (price < 4000) embed.setDescription(
            `아무도 도토리 ${price}개를 획득하지 못하셨습니다!`);
        else embed.setDescription('아무도 레이드를 성공하지 못했습니다!'
            + `\n무려 ${price}개짜리였는데!`);
        return embed;
    }
    let bonus = raiders[0];
    let boosts = [], normals = [];
    let rewards = {};
    for (const raider of raiders.slice(1)) {
        if (raider.premiumSince != undefined) boosts.push(raider);
        else normals.push(raider);
    }
    if (normals.length > 0) {
        let desc = '';
        for (const raider of normals) {
            rewards[raider.id] = price;
            desc += `${raider.displayName}\t `;
        }
        embed.addField(
            name = `${price}개 획득 성공!`,
            value = removeMD(desc.slice(0, -2)));
    }
    if (boosts.length > 0) {
        let desc = ''
        for (const raider of boosts) {
            rewards[raider.id] = Math.round(1.5 * price);
            desc += `${raider.displayName}\t `;
        }
        embed.addField(
            name = `부스터 1.5배 혜택으로 ${Math.round(1.5 * price)}개 획득 성공!`,
            value = removeMD(desc.slice(0, -2)));
    }
    if (bonus.premiumSince) {
        rewards[bonus.id] = 3 * price;
        embed.addField(
            name = `부스터 1.5배 혜택과 레이드 2배 당첨까지! ${3 * price}개 획득 성공!`,
            value = '||' + removeMD(bonus.displayName) + '||');
    }
    else {
        rewards[bonus.id] = 2 * price;
        embed.addField(
            name = `레이드 2배 당첨으로 ${2 * price}개 획득 성공!`,
            value = '||' + removeMD(bonus.displayName) + '||');
    }
    stmt = 'UPDATE users SET money = money + ? WHERE id = ?';
    for (const id in rewards) await SafeDB(stmt, 'run', rewards[id], id);
    return embed;
}

function shuffle(array) {
    currentIndex = array.length, randomIndex = 0;
    while (currentIndex != 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}

function removeMD(txt) {
    for (const c of '\\<:`(_*~|@') {
        txt = txt.split(c).join('\\' + c);
    }
    txt = txt.split(',').join('.');
    txt = txt.split('\t').join(',');
    return txt;
}
