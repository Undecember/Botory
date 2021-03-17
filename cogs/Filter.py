import discord, uuid
from discord.ext import commands
from pkgs.GlobalDB import GlobalDB
from pkgs.DBCog import DBCog
from functools import wraps

def SkipCheck(func):
    @wraps(func)
    async def wrapper(self, message):
        if message.guild.id != GlobalDB['StoryGuildID']: return
        if message.author.bot or message.author.guild_permissions.administrator: return
        return await func(self, message)
    return wrapper

class Core(DBCog):
    def __init__(self, app):
        self.CogName = 'Filter'
        DBCog.__init__(self, app)

    def initDB(self):
        self.DB = dict()
        self.DB['ReportChannel'] = None

    @commands.command(name = 'reporthere')
    @commands.has_guild_permissions(administrator = True)
    async def SetChannels(self, ctx):
        if ctx.guild.id != GlobalDB['StoryGuildID']: return
        await ctx.message.delete()
        self.DB['ReportChannel'] = ctx.channel.id

    @commands.Cog.listener('on_message')
    @SkipCheck
    async def ModShouldBeOnline(self, message):
        if '경찰' in map(lambda x: x.name, message.author.roles) and message.author.status == discord.Status.offline:
            await message.channel.send(f'<@{message.author.id}> 관리자께서는 되도록이면 오프라인 상태를 해제하여 관리활동 중임을 표시해주세요.')

    @commands.Cog.listener('on_message')
    @SkipCheck
    async def NoMiddleFinger(self, message):
        if '🖕' in message.content:
            await message.delete()
            await self.MiddleFingerReport(message.author.id, message.channel)

    @commands.Cog.listener('on_message')
    @SkipCheck
    async def DontMentionMaster(self, message):
        if "서버장" in list(map(lambda x: x.top_role.name, message.mentions)):
            await message.channel.send("<@%d> 허가받은 역할멘션 외 서버장 직접 멘션은 경고조치됩니다."%message.author.id)
            if self.DB['ReportChannel']:
                ReportChannel = message.guild.get_channel(self.DB['ReportChannel'])
                await ReportChannel.send("<@%d> 이 사용자 서버장 직접멘션으로 경고바랍니다."%message.author.id, allowed_mentions = discord.AllowedMentions.none())

    @commands.Cog.listener('on_message')
    @SkipCheck
    async def DontMentionReply(self, message):
        if message.reference != None:
            if message.reference.resolved.author in message.mentions:
                await message.channel.send('답장을 할 때는 되도록이면 오른쪽 `@켜짐`을 눌러 멘션을 꺼주세요!', delete_after = 5.0, reference = message)

    @commands.Cog.listener()
    async def on_reaction_add(self, reaction, user):
        if reaction.message.guild.id != GlobalDB['StoryGuildID']: return
        if user.bot or user.guild_permissions.administrator: return
        if '🖕' in str(reaction.emoji):
            await reaction.clear()
            await self.MiddleFingerReport(user.id, reaction.message.channel)

    async def MiddleFingerReport(self, UserID, channel):
        ReportChannel = channel.guild.get_channel(self.DB['ReportChannel'])
        await channel.send(f'<@{UserID}> 중지 절단 완료.')
        if ReportChannel:
            await ReportChannel.send(f'<@{UserID}> 이 사용자 중지 이모지 사용으로 경고바랍니다.', allowed_mentions = discord.AllowedMentions.none())

    @commands.command(name = 'ignorehere')
    @commands.has_guild_permissions(administrator = True)
    async def SetIgnore(self, ctx):
        await ctx.message.delete()
        GlobalDB['IgnoreChannels'].add(ctx.channel.id)

    @commands.command(name = 'watchhere')
    @commands.has_guild_permissions(administrator = True)
    async def DelIgnore(self, ctx):
        await ctx.message.delete()
        GlobalDB['IgnoreChannels'].remove(ctx.channel.id)

