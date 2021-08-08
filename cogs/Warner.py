import discord, uuid, re
from discord.ext import commands
from StudioBot.pkgs.DBCog import DBCog
import asyncio
from StudioBot.cogs.Moderator import ModCheck
from datetime import datetime

class Warn:
    def __init__(self, user, moderator, reason):
        self.user = user
        self.moderator = moderator
        self.reason = reason
        self.create_at = datetime.now()

class Warner(DBCog):
    def __init__(self, app):
        self.StoryGuild = self.MutedRole = None
        DBCog.__init__(self, app)

    def initDB(self): return

    #@commands.command(name = 'warn')
    #@ModCheck
    #async def warn(self, ctx, who: discord.Member, *, reason = None):
    #    return

    @commands.Cog.listener()
    async def on_ready(self):
        self.StoryGuild = self.app.get_guild(self.GetGlobalDB()['StoryGuildID'])
