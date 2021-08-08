import discord, uuid, re
from discord.ext import commands
from StudioBot.pkgs.DBCog import DBCog
import asyncio
from functools import wraps

def ModCheck(func):
    @wraps(func)
    async def wrapper(self, ctx, *args, **kwargs):
        if ctx.guild == None: return
        if ctx.guild.id != self.GetGlobalDB()['StoryGuildID']: return
        if not ctx.author.guild_permissions.administrator and not ctx.author == ctx.guild.owner:
            modrole = self.StoryGuild.get_role(self.GetGlobalDB('Moderator')['ModRoleID'])
            if modrole not in ctx.author.roles: return
        await ctx.message.delete()
        return await func(self, ctx, *args, **kwargs)
    return wrapper

class Moderator(DBCog):
    def __init__(self, app):
        self.StoryGuild = self.MutedRole = None
        DBCog.__init__(self, app)

    def initDB(self):
        self.DB['ModRoleID'] = None
        self.DB['MutedRoleID'] = None

    @commands.command(name = 'ban')
    @commands.has_guild_permissions(administrator = True)
    async def ban(self, ctx, who: discord.User, reason = None):
        await ctx.message.delete()
        try:
            if not who.dm_channel: await who.create_dm()
            embed = discord.Embed(title = 'RIP :zany_face:', description = f'THE STORIES 서버에서 밴되셨습니다')
            if reason: embed.add_field(name = '사유', value = reason)
            await who.dm_channel.send(embed = embed)
        except: pass
        await ctx.guild.ban(who, reason = reason, delete_message_days = 7)
        await ctx.send(embed = discord.Embed(title = 'RIP :zany_face:', description = f'**{who.name}#{who.discriminator}**'))

    @commands.command(name = 'setmuterole')
    @commands.has_guild_permissions(administrator = True)
    async def SetMuteRole(self, ctx, role: discord.Role):
        await ctx.message.delete()
        self.DB['MutedRoleID'] = role.id
        self.MutedRole = role

    @commands.command(name = 'setmodrole')
    @commands.has_guild_permissions(administrator = True)
    async def SetModRole(self, ctx, role: discord.Role):
        await ctx.message.delete()
        self.DB['ModRoleID'] = role.id
        self.ModRole = role

    @commands.command(name = 'mute')
    @ModCheck
    async def mute(self, ctx, who: discord.Member, *, reason = None):
        if not self.MutedRole: return
        await who.add_roles(self.MutedRole, reason = reason)
        embed = discord.Embed(title = '', description = '뮤트되었습니다')
        embed.set_author(name = self.GetDisplayName(who), icon_url = who.avatar.url)
        if reason: embed.add_field(name = '사유', value = reason)
        await ctx.send(embed = embed)

    @commands.command(name = 'unmute')
    @ModCheck
    async def unmute(self, ctx, who: discord.Member):
        if not self.MutedRole: return
        await who.remove_roles(self.MutedRole)
        embed = discord.Embed(title = '', description = '언뮤트되었습니다')
        embed.set_author(name = self.GetDisplayName(who), icon_url = who.avatar.url)
        await ctx.send(embed = embed)

    @commands.Cog.listener()
    async def on_ready(self):
        self.StoryGuild = self.app.get_guild(self.GetGlobalDB()['StoryGuildID'])
        self.MutedRole = self.StoryGuild.get_role(self.DB['MutedRoleID'])
        self.ModRole = self.StoryGuild.get_role(self.DB['ModRoleID'])
