import discord
from discord.ext import commands
from StudioBot.pkgs.DBCog import DBCog
from functools import wraps
import asyncio

class NTButton(discord.ui.Button):
    def __init__(self):
        super().__init__(style = discord.ButtonStyle.primary, label = '스레드 생성 동의')

    async def callback(self, interaction: discord.Interaction):
        assert self.view
        if interaction.user in self.view.voters: await interaction.response.defer()
        else:
            self.view.voters.add(interaction.user)
            await interaction.response.send_message(content = '동의되었습니다.', ephemeral = True)

class NTVote(discord.ui.View):
    def __init__(self, voters):
        super().__init__()
        self.voters = voters
        self.button = NTButton()
        self.add_item(self.button)

def NewThread_Check(func):
    @wraps(func)
    async def wrapper(self, ctx, topic):
        if ctx.guild == None: return
        if ctx.guild.id != self.GetGlobalDB()['StoryGuildID']: return
        if ctx.channel.id not in self.DB['allowed']: return
        await ctx.message.delete()
        return await func(self, ctx, topic)
    return wrapper

class Threading(DBCog):
    def __init__(self, app): DBCog.__init__(self, app)
    def initDB(self):
        self.DB['allowed'] = set()
        self.DB['deadline'] = 5

    @commands.group(name = 'thread')
    @commands.has_guild_permissions(administrator = True)
    async def ThreadingGroup(self, ctx):
        if ctx.guild.id != self.GetGlobalDB()['StoryGuildID']: return
        await ctx.message.delete()

    @ThreadingGroup.command(name = 'deadline')
    @commands.has_guild_permissions(administrator = True)
    async def SetDeadLine(self, ctx, deadline : int): self.DB['deadline'] = deadline

    @ThreadingGroup.command(name = 'allow')
    async def AllowThread(self, ctx): self.DB['allowed'].add(ctx.channel.id)

    @ThreadingGroup.command(name = 'deny')
    async def DenyThread(self, ctx): self.DB['allowed'].discard(ctx.channel.id)

    @commands.command(name = 'newthread', aliases = ['새스레드', '스레드'])
    @NewThread_Check
    @commands.cooldown(1, 60)
    async def NewThread(self, ctx, topic = None):
        if not topic:
            await ctx.send(f'`{ctx.prefix}{ctx.invoked_with} (주제)` 형식으로 해주세요.')
            return
        for c in '\\<:`(_*~|@':
            if c in topic:
                await ctx.send(f'주제에는 마크다운 문자 "\{c}"를 포함하지 마세요.')
                return
        voters = set()
        view = NTVote(voters)
        msg = await ctx.send(
            content = f'<@{ctx.author.id}>님이 ```{topic}```을 주제로 스레드를 추가하기를 제안하셨습니다.'
                + f'\n10초 내로 {self.DB["deadline"]}명 이상이 동의하면 스레드가 생성됩니다.',
            view = view)
        await asyncio.sleep(10)
        view.stop()
        if len(voters) < self.DB['deadline']:
            await msg.edit(f'충분한 동의를 얻지 못해 스레드 생성이 취소되었습니다.', view = None)
            return
        await msg.edit(content = f'{len(voters)}개의 동의를 얻어 스레드가 생성됩니다.', view = None)
        msg = await ctx.send(embed = discord.Embed(title = '새 스레드 오픈', description = f'주제 : {topic}'))
        thread = await ctx.channel.start_thread(name = topic, message = msg)
        await thread.edit(slowmode_delay = ctx.channel.slowmode_delay)

    @NewThread.error
    async def NewThreadOnCooldown(self, ctx, error):
        if isinstance(error, commands.CommandOnCooldown):
            await ctx.send("스레드 명령어는 1분에 한번만 사용할 수 있습니다.", delete_after = 5.0)
