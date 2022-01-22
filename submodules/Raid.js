const { guildId } = require('../config.json');
const { v4: uuid4 } = require('uuid');
const { db } = require('../db.js');
const { MessageActionRow, MessageButton, MessageEmbed } = require('discord.js');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

var StoryGuild, RaidChannel;
function _setup(client) {
    stmt = db.prepare("SELECT id FROM channels WHERE key = ?");
    const RaidChannelId = stmt.get('raid').id;
    stmt = db.prepare("SELECT id FROM guilds WHERE key = ?");
    const StoryGuildId = stmt.get('story').id;
    client.guilds.fetch(StoryGuildId.toString()).then(async (guild) => {
        StoryGuild = guild;
        RaidChannel = await StoryGuild.channels.fetch(RaidChannelId);
        AutoRaidMsg(client);
    });
    client.on('interactionCreate', async interaction => {
        if (!interaction.isCommand()) return;
        const { commandName } = interaction;
        if (commandName === 'goraid') return await cmd_goraid(interaction);
    });
}

module.exports = { _setup };

var killflag = false, ForcePrice;
async function cmd_goraid(interaction) {
    ForcePrice = interaction.options.getInteger('price');
    if (ForcePrice === null) ForcePrice = 2000;
    await interaction.reply({ content: 'Go Raid ' + ForcePrice + '!', ephemeral: true });
    killflag = true
}

async function AutoRaidMsg(client) {
    while (true) {
        try {
            timeflag = Date.now();
            price = 2000;
            if (Math.random() * 10 < -1 || killflag) {
                if (killflag) {
                    price = ForcePrice;
                    killflag = false;
                }
                embed = new MessageEmbed()
                    .setTitle('도토리 레이드 도착!')
                    .setDescription('15초 안에 아래 버튼을 눌러서 도토리 ' + price + '개를 받으세요!')
                CID = uuid4();
                ActionRow = new MessageActionRow()
                    .addComponents(
                        new MessageButton()
                            .setCustomId(CID)
                            .setLabel('레이드 받기')
                            .setStyle('PRIMARY'));
                raiders = new Set();
                listener = async (interaction) => {
                        if (!interaction.isButton()) return;
                        if (interaction.component.customId != CID) return;
                        if (!await CheckActive(interaction.user, beforeMsgs)) return await interaction.reply({
                            content: '최근 활동이 없어 참가 거부되었습니다.', ephemeral: true });
                        raiders.add(interaction.user.id);
                        await interaction.reply({
                            content: '레이드 참가되었습니다.', ephemeral: true });
                };
                client.on('interactionCreate', listener);
                RaidMsg = await RaidChannel.send({ embeds: [embed], components: [ActionRow] });
                beforeMsgs = await RaidChannel.messages.fetch({ before: RaidMsg.id, limit: 100 });
                await sleep(15 * 1000);
                embed = await GenRaidEmbed(raiders, price);
                await RaidMsg.edit({ embeds: [embed], components: [] });
            }
        } catch (e) { console.error(e); }
        while (Date.now() - timeflag < 3 * 60 * 1000 && !killflag) await sleep(100);
    }
}

async function CheckActive(user, msgs) {
    chk = msgs.filter(m => m.author.id == user.id);
    if (chk.size == 0) return false;
    return Date.now() - chk.first().createdAt < 5 * 60 * 1000;
}

async function GenRaidEmbed(_raiders, price) {
    _raiders = Array.from(_raiders);
    raiders = [];
    for (id of _raiders) {
        try {
            raider = await StoryGuild.members.fetch(id);
            raiders.push(raider);
        } catch {}
    }
    raiders = shuffle(raiders);
    embed = new MessageEmbed().setTitle('도토리 레이드 마감~~!');
    if (raiders.length == 0) {
        if (price < 4000) embed.setDescription('아무도 도토리 ' + price + '개를 획득하지 못하셨습니다!');
        else embed.setDescription('아무도 레이드를 성공하지 못했습니다!\n무려 ' + price + '개짜리였는데!');
        return embed;
    }
    bonus = raiders[0];
    boosts = [], normals = [];
    rewards = {};
    for (raider of raiders.slice(1)) {
        if (raider.premiumSince != undefined) boosts.push(raider);
        else normals.push(raider);
    }
    if (normals.length > 0) {
        desc = '';
        for (raider of normals) {
            rewards[raider.id] = price;
            dispname = raider.displayName;
            desc += dispname + ', ';
        }
        embed.addField(name = price + '개 획득 성공!', value = removeMD(desc.slice(0, -2)));
    }
    if (boosts.length > 0) {
        desc = ''
        for (raider of boosts) {
            rewards[raider.id] = Math.round(1.5 * price);
            dispname = raider.displayName;
            desc += dispname + ', ';
        }
        embed.addField(name = '부스터 1.5배 혜택으로 ' + Math.round(1.5 * price) + '개 획득 성공!', value = removeMD(desc.slice(0, -2)));
    }
    if (bonus.premiumSince) {
        rewards[bonus.id] = 3 * price;
        embed.addField(name = '부스터 1.5배 혜택과 레이드 2배 당첨까지! ' + 3 * price + '개 획득 성공!', value = '||' + removeMD(bonus.displayName) + '||');
    }
    else {
        rewards[bonus.id] = 2 * price;
        embed.addField(name = '레이드 2배 당첨으로 ' + 2 * price + '개 획득 성공!', value = '||' + removeMD(bonus.displayName) + '||');
    }
    stmt = db.prepare("UPDATE users SET xp = xp + ? WHERE id = ?");
    for (id in rewards) stmt.run(rewards[id], id);
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
    for (c of '\\<:`(_*~|@') {
        txt = txt.split(c).join('\\' + c);
    }
    txt = txt.split(',').join('.');
    return txt;
}
