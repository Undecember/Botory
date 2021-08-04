import discord, asyncio
from StudioBot.pkgs.DBCog import DBCog
from discord.ext import commands

class Onoff(DBCog):
    def __init__(self, app): DBCog.__init__(self, app)
    def initDB(self): self.DB['StopChannel'] = None

    @commands.Cog.listener()
    async def on_ready(self):
        version = '4.0.0 (Deadflag testing)'
        await self.app.change_presence(activity = discord.Game(f'Botory {version} by Undec'))
        guild = self.app.get_guild(self.GetGlobalDB()['StoryGuildID'])
        if self.DB['StopChannel']:
            StopChannel = guild.get_channel(self.DB['StopChannel'])
            await StopChannel.send(f'보토리 {version} is back.')

    @commands.command(name = 'stop')
    @commands.has_guild_permissions(administrator = True)
    async def StopApp(self, ctx):
        await ctx.message.delete()
        self.DB['StopChannel'] = ctx.channel.id
        deadmsg = await ctx.channel.send('장비를 정지합니다...')
        self.GetGlobalDB()['deadflag'] = set()
        await asyncio.sleep(1)
        while self.GetGlobalDB()['deadflag']: continue
        del self.GetGlobalDB()['deadflag']
        await deadmsg.edit(content = '장비를 정지했습니다.')
        await self.app.change_presence(status = discord.Status.offline)
        await asyncio.sleep(1)
        await self.app.close()
