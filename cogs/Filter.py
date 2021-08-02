import discord, uuid
from discord.ext import commands
from StudioBot.pkgs.DBCog import DBCog
from functools import wraps

def SkipCheck(func):
    @wraps(func)
    async def wrapper(self, message):
        if message.guild == None: return
        if message.guild.id != self.GetGlobalDB()['StoryGuildID']: return
        if message.author.bot or message.author.guild_permissions.administrator: return
        return await func(self, message)
    return wrapper

class Filter(DBCog):
    def __init__(self, app): DBCog.__init__(self, app)
    def initDB(self): self.DB['ReportChannel'] = None

    @commands.command(name = 'reporthere')
    @commands.has_guild_permissions(administrator = True)
    async def SetChannels(self, ctx):
        if ctx.guild.id != self.GetGlobalDB()['StoryGuildID']: return
        await ctx.message.delete()
        self.DB['ReportChannel'] = ctx.channel.id

    @commands.Cog.listener('on_message')
    @SkipCheck
    async def ModShouldBeOnline(self, message):
        if message.author.status != discord.Status.offline: return
        if message.channel.permissions_for(message.author).manage_messages and not message.author.guild_permissions.administrator:
            await message.channel.send(f'<@{message.author.id}> 관리자께서는 되도록이면 오프라인 상태를 해제하여 관리활동 중임을 표시해주세요.', delete_after = 10.0)

    @commands.Cog.listener('on_message')
    @SkipCheck
    async def NoMiddleFinger(self, message):
        if '🖕' in message.content:
            await message.delete()
            await self.MiddleFingerReport(message.author, message.channel)

    @commands.Cog.listener()
    async def on_reaction_add(self, reaction, user):
        if reaction.message.guild == None: return
        if reaction.message.guild.id != self.GetGlobalDB()['StoryGuildID']: return
        if user.bot or user.guild_permissions.administrator: return
        if '🖕' in str(reaction.emoji):
            await reaction.clear()
            await self.MiddleFingerReport(user, reaction.message.channel)

    async def MiddleFingerReport(self, user, channel):
        ReportChannel = channel.guild.get_channel(self.DB['ReportChannel'])
        await channel.send(f'<@{user.id}> 중지 절단 완료.')
        if ReportChannel:
            await ReportChannel.send(f'<@{user.id}> 이 사용자 중지 이모지 사용으로 경고바랍니다.', allowed_mentions = discord.AllowedMentions.none())

    @commands.command(name = 'report', aliases = ['신고'])
    async def SetChannels(self, ctx, *args):
        if ctx.guild.id != self.GetGlobalDB()['StoryGuildID']: return
        await ctx.message.delete()
        if ctx.message.reference == None: return
        reason = ctx.message.content[len(f'{ctx.prefix}{ctx.invoked_with}'):].strip()
        ReportChannel = ctx.guild.get_channel(self.DB['ReportChannel'])
        ReferenceMessage = await self.MessageFromLink(ctx.message.reference.jump_url)
        async for msg in ReportChannel.history(limit = 10):
            if msg.embeds[0].fields[4].value == str(ReferenceMessage.id):
                await ctx.send('이미 신고된 메세지입니다', delete_after = 5.0)
                return
        embed = discord.Embed(title = '신고', description = '')
        embed.add_field(name = '신고자', value = f'<@{ctx.author.id}>', inline = False)
        embed.add_field(name = '신고대상자', value = f'<@{ReferenceMessage.author.id}>', inline = False)
        embed.add_field(name = '신고대상 메세지 채널', value = f'<#{ReferenceMessage.channel.id}>', inline = False)
        embed.add_field(name = '신고대상 메세지 링크', value = f'[이동하기]({ReferenceMessage.jump_url})', inline = False)
        embed.add_field(name = '신고대상 메세지 id', value = f'{ReferenceMessage.id}', inline = False)
        if len(reason) > 0: embed.add_field(name = '신고사유', value = f'{reason}', inline = False)
        await ReportChannel.send(embed = embed)
