const { spawn } = require('child_process');
const fs = require('fs');
const { v4: uuid4 } = require('uuid');
const { db } = require('../db.js');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

var StoryGuild, MemberRole, TotoChannel;
function _setup(client) {
    stmt = db.prepare('SELECT id FROM channels WHERE key = ?');
    const TotoChannelId = stmt.get('toto').id;
    stmt = db.prepare("SELECT id FROM roles WHERE key = ?");
    const MemberRoleId = stmt.get('member').id;
    stmt = db.prepare('SELECT id FROM guilds WHERE key = ?');
    client.guilds.fetch(stmt.get('story').id.toString()).then(async (guild) => {
        StoryGuild = guild;
        TotoChannel = await StoryGuild.channels.fetch(TotoChannelId.toString());
        MemberRole = await StoryGuild.roles.fetch(MemberRoleId.toString());
    });
    client.on('interactionCreate', async interaction => {
        if (!interaction.isCommand()) return;
        const { commandName } = interaction;
        try {
            if (commandName != 'toto') return;
            cmd = interaction.options.getSubcommand();
            try {
                if (cmd == 'new') return await cmd_toto_new(interaction);
                if (cmd == 'end') return await cmd_toto_end(interaction);
                if (cmd == 'cancel') return await cmd_toto_cancel(interaction);
                if (cmd == 'stopbet') return await cmd_toto_stopbet(interaction);
            } catch (e) {
                console.error(e);
                return await interaction.reply({ content: 'failed!', ephemeral: true });
            }
        } catch (e) { console.error(e); }
    });
}

module.exports = { _setup };

var toto = null; 
async function cmd_toto_new(interaction) {
    toto = {};
    toto.title = interaction.options.getString('title');
    toto.description = interaction.options.getString('desc').replace('\\n', '\n');
    toto.Aname = interaction.options.getString('aname');
    toto.Bname = interaction.options.getString('bname');
    toto.BetTime = interaction.options.getString('close');
    await UpdateToto();
    /*await TotoChannel.permissionOverwrites(MemberRole, {
        SEND_MESSAGES: true,
        VIEW_CHANNEL: true
    });
    toto.on_bet = true;
    await ctx.send(`새로운 토토가 <#${TotoChannel.id}>에서 시작되었습니다!`)
    AutoUpdateEmbed(TotoMessage);
    app.wait_for('message', check = check)
    await TotoChannel.permissionOverwrites(MemberRole, {
        SEND_MESSAGES: false,
        VIEW_CHANNEL: true
    });
    toto.on_bet = false;
    StopUpdateEmbed();
    UpdateEmbed(TotoMessage);*/
    return;
}

async function UpdateToto(TotoMessage = null) {
    await TotoChannel.send({
        embeds: [{
            title : toto.title,
            color : 10690248,
            description : "a\tb\naa\tb"
        }]
    })
}

/*async function get_(self, index, guild):
    cnt = len(self.toto.bet[index])
    res = f'총 베팅 : {cnt}명 - {self.toto.gettot(index)}개'
    if cnt > 0:
        maxwho, maxbet = self.toto.getmax(index)
        res += f'\n최대 베팅 : {maxwho} - {maxbet}개'
    prop = self.toto.getprop(index)
    if prop >= 0: res += '\n배당률 : %.2f'%(prop + 1)
    return res*/
