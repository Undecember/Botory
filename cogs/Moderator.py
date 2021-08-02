import discord, uuid, re
from discord.ext import commands
from StudioBot.pkgs.DBCog import DBCog
import asyncio

class RoleDropdown(discord.ui.Select):
    def __init__(self, roles):
        super().__init__(placeholder = '역할을 선택하세요')
        for role in roles:
            rolename = role.name
            if len(rolename) > 25: rolename = rolename[:22] + '...'
            self.add_option(label = rolename, value = str(role.id))
    
    async def callback(self, interaction: discord.Interaction):
        assert self.view
        self.view.values = self.values
        await interaction.response.defer()

class RoleButton(discord.ui.Button):
    def __init__(self):
        super().__init__(style = discord.ButtonStyle.primary, label='확인')
    
    async def callback(self, interaction: discord.Interaction):
        assert self.view
        await interaction.response.defer()
        self.view.stop()

class RoleSelector(discord.ui.View):
    def __init__(self, roles, user : discord.User):
        super().__init__()
        self.values = None
        self.user = user
        self.add_item(RoleDropdown(roles))
        self.add_item(RoleButton())

    async def interaction_check(self, interaction: discord.Interaction):
        return interaction.user == self.user

class Moderator(DBCog):
    def __init__(self, app): DBCog.__init__(self, app)

    def initDB(self): return

    @commands.command(name = 'ban')
    @commands.has_guild_permissions(administrator = True)
    async def ModBan(self, ctx, who: discord.User, reason = None):
        await ctx.guild.ban(who, reason = reason, delete_message_days = 7)
        await ctx.send(embed = discord.Embed(title = 'RIP :zany_face:', description = f'**{who.name}#{who.discriminator}**'))

    @commands.command(name = 'bustercall', aliases = ['버스터콜', 'bc'])
    async def BusterCall(self, ctx):
        if not ctx.guild: return
        if ctx.guild.id != self.GetGlobalDB()['StoryGuildID']: return
        await ctx.message.delete()
        roles = set()
        for role in ctx.author.roles:
            if role.id in self.DB:
                for roleid in self.DB[role.id]: roles.add(roleid)
        for roleid in list(roles):
            roles.remove(roleid)
            try: roles.add(ctx.guild.get_role(roleid))
            except: pass
        roles = list(roles)
        if not roles:
            await ctx.send('호출 허가된 역할이 없습니다.')
            return
        view = RoleSelector(roles, ctx.author)
        msg = await ctx.send(f'<@{ctx.author.id}> 호출할 역할을 고르세요', view = view)
        while not view.is_finished(): await asyncio.sleep(0.1)
        await msg.delete()
        if not view.values: return
        roleid = view.values[0]
        await ctx.send(f'<@&{roleid}>')

    @commands.command(name = 'allowcall')
    @commands.has_guild_permissions(administrator = True)
    async def AllowCall(self, ctx, role : discord.Role, *roles : discord.Role):
        if ctx.guild.id != self.GetGlobalDB()['StoryGuildID']: return
        await ctx.message.delete()
        if role.id not in self.DB: self.DB[role.id] = set()
        for _role in roles: self.DB[role.id].add(_role.id)

    @commands.command(name = 'denycall')
    @commands.has_guild_permissions(administrator = True)
    async def DenyCall(self, ctx, role : discord.Role, *roles : discord.Role):
        if ctx.guild.id != self.GetGlobalDB()['StoryGuildID']: return
        await ctx.message.delete()
        if role.id not in self.DB: self.DB[role.id] = set()
        for _role in roles: self.DB[role.id].discard(_role.id)
        if not self.DB[role.id]: del self.DB[role.id]
