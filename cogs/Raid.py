import discord
from discord.ext import commands, tasks
from StudioBot.pkgs.DBCog import DBCog
import asyncio, random
from datetime import datetime

class RaidButton(discord.ui.Button):
    def __init__(self):
        super().__init__(style = discord.ButtonStyle.primary, label = '레이드 받기')

    async def callback(self, interaction: discord.Interaction):
        assert self.view
        if interaction.user in self.view.raiders:
            await interaction.response.send_message(content = '이미 누르셨습니다.', ephemeral = True)
        else:
            self.view.raiders.add(interaction.user)
            await interaction.response.send_message(content = '레이드 참가되었습니다.', ephemeral = True)

class RaidGame(discord.ui.View):
    def __init__(self, raiders):
        super().__init__()
        self.raiders = raiders
        self.button = RaidButton()
        self.add_item(self.button)

class Raid(DBCog):
    def __init__(self, app): super().__init__(app)
    def initDB(self):
        self.DB['RaidChannel'] = None
        self.DB['LastRaid'] = None

    @commands.command(name = 'setraidhere')
    @commands.has_guild_permissions(administrator = True)
    async def SetRaidHere(self, ctx):
        if ctx.guild.id != self.GetGlobalDB()['StoryGuildID']: return
        await ctx.message.delete()
        self.DB['RaidChannel'] = ctx.channel.id

    @commands.command(name = 'goraid')
    @commands.has_guild_permissions(administrator = True)
    async def GoRaid(self, ctx, prize = None):
        await ctx.message.delete()
        self.prize = -1
        if prize:
            try: self.prize = int(prize)
            except: pass
        self.FeverRaid.restart()

    @tasks.loop(minutes = 3)
    async def FeverRaid(self):
        def removemd(txt):
            for c in '\\<:`(_*~|@': txt = txt.replace(c, '\\' + c)
            return txt
        guild = self.app.get_guild(self.GetGlobalDB()['StoryGuildID'])        
        RaidChannel = guild.get_channel(self.DB['RaidChannel'])
        if RaidChannel == None: return
        try:
            if self.prize: forceraid = True
        except: forceraid = False
        if not forceraid:
            try:
                if (await RaidChannel.fetch_message(RaidChannel.last_message_id)).author.bot: return
            except: pass
            if random.random() >= 1 / 10: return
        aww = discord.utils.get(guild.emojis, name = 'rage_aww')
        prize = -1
        if forceraid:
            prize = self.prize
            del self.prize
        if prize < 0:
            prize = 2000
            if self.DB['LastRaid']:
                hdelta = (datetime.now() - self.DB['LastRaid']).total_seconds() / 3600
                prize = max([int(hdelta * 4000), prize])
        RaidButtonUI = discord.ui.View()
        RaidButtonUI.add_item(discord.ui.Button(
            style = discord.ButtonStyle.primary,
            
            ))
        raiders = set()
        raid = RaidGame(raiders)
        RaidMessage = await RaidChannel.send(embed = discord.Embed(
            title = '도토리 레이드 도착!',
            description = f'15초 안에 아래 버튼을 눌러서 도토리 {prize}개를 받으세요!'), view = raid)
        await asyncio.sleep(15)
        raid.stop()
        desc = ''
        if len(raiders) == 0:
            if prize < 4000: desc = f'아무도 도토리 {prize}개를 획득하지 못하셨습니다!'
            else: desc = f'아무도 레이드를 성공하지 못했습니다!\n무려 {prize}개짜리였는데!'
            await RaidMessage.edit(embed = discord.Embed(title = '도토리 레이드 마감~~!', description = desc), view = None)
            return
        raiders = list(raiders)
        random.shuffle(raiders)
        bonus = raiders[0]
        boosts, normals = [], []
        rewards = dict()
        for raider in raiders[1:]:
            if raider.premium_since: boosts.append(raider)
            else: normals.append(raider)
        embed = discord.Embed(title = '도토리 레이드 마감~~!', description = '')
        if len(normals) > 0:
            desc = ''
            for raider in normals:
                rewards[raider.id] = prize
                dispname = self.GetDisplayName(raider)
                desc += dispname + ', '
            embed.add_field(name = f'{prize}개 획득 성공!', value = removemd(desc[:-2]), inline = False)
        if len(boosts) > 0:
            desc = ''
            for raider in boosts:
                rewards[raider.id] = round(1.5 * prize)
                dispname = self.GetDisplayName(raider)
                desc += dispname + ', '
            embed.add_field(name = f'부스터 1.5배 혜택으로 {round(1.5 * prize)}개 획득 성공!', value = removemd(desc[:-2]), inline = False)
        if bonus.premium_since:
            rewards[bonus.id] = 3 * prize
            embed.add_field(name = f'부스터 1.5배 혜택과 레이드 2배 당첨까지! {3 * prize}개 획득 성공!', value = '||' + removemd(self.GetDisplayName(bonus)) + '||', inline = False)
        else:
            rewards[bonus.id] = 2 * prize
            embed.add_field(name = f'레이드 2배 당첨으로 {2 * prize}개 획득 성공!', value = '||' + removemd(self.GetDisplayName(bonus)) + '||', inline = False)
        await RaidMessage.edit(embed = embed, view = None)
        for userid in rewards:
            self.GetGlobalDB('Money')['mns'][userid] = self.GetGlobalDB('Money')['mns'].get(userid, 0) + rewards[userid]

    @commands.Cog.listener()
    async def on_ready(self): self.FeverRaid.start()
