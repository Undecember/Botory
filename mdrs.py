from datetime import datetime
from db import *
from discord.ext import commands
import imagecomp

async def middle_finger_report(userid, mcnl):
    global db
    cnl = db.cnls['report']
    await mcnl.send("<@%d> 중지 절단 완료."%userid)
    if db.cnls['report'] != None:
        await db.cnls['report'].send("<@%d> 이 사용자 중지 이모지 사용으로 경고바랍니다."%userid, allowed_mentions = discord.AllowedMentions.none())

async def filter_message(message):
    global db
    if message.author.top_role.name in ['서버장', '대장']: return False
    if '🖕' in message.content:
        await middle_finger_report(message.author.id, message.channel)
        return True
    if "서버장" in list(map(lambda x: x.top_role.name, message.mentions)):
        await message.channel.send("<@%d> 허가받은 역할멘션 외 서버장 직접 멘션은 경고조치됩니다."%message.author.id)
        if db.cnls['report'] != None:
            await db.cnls['report'].send("<@%d> 이 사용자 서버장 직접멘션으로 경고바랍니다."%message.author.id, allowed_mentions = discord.AllowedMentions.none())
        return True
    if message.channel == db.cnls['rankonly']:
        if len(message.attachments): return True
        if message.content[:5] != '!rank': return True
        if len(message.mentions):
            await message.channel.send("<@%d> 멘션을 사용한 랭크명령어는 경고조치됩니다."%message.author.id, delete_after = 1.0)
            if db.cnls['report'] != None:
                await db.cnls['report'].send("<@%d> 이 사용자 랭크명령어 멘션으로 경고바랍니다."%message.author.id, allowed_mentions = discord.AllowedMentions.none())
            return True
    if len(message.content) > db.maxmsglen:
        await message.channel.send("<@%d> %d자 초과로 삭제되었습니다."%(message.author.id, db.maxmsglen), delete_after = 1.0)
        return True
    if message.content.count('\n') > 4:
        await message.channel.send("<@%d> 5줄 이상은 안받아요."%message.author.id, delete_after = 1.0)
        return True
    return False

async def autoreact(message):
    if message.author in db.autoreacts:
        if db.autoreacts[message.author]['tilwhen'] < datetime.now():
            del db.autoreacts[message.author]
            return
        emjs = db.autoreacts[message.author]['emjs']
        for emj in emjs:
            if type(emj) != str: emj = discord.utils.get(message.guild.emojis, id=emj)
            await message.add_reaction(emj)

async def attach_mdr(message):
    global db, imgdc
    ofls, cfls = [], []
    cnt = 0
    for att in message.attachments:
        opth = 'ats/' + att.filename
        await att.save(opth)
        ofl = discord.File(open(opth, 'rb'))
        ofls.append(ofl)
        npth = imagecomp.comp(opth)
        if opth == npth: cfls.append(ofl)
        else:
            cfls.append(discord.File(open(npth, 'rb')))
            cnt += 1
    cnl = db.cnls['attachlog']
    if len(ofls) and cnl != None:
        dispname = message.author.nick
        if dispname == None: dispname = message.author.name
        embed = discord.Embed()
        embed.image = ofls
        embed.title = message.author.id
        embed.description = message.content
        await cnl.send(embed=embed,
            allowed_mentions=discord.AllowedMentions.none())
        if cnt:
            await message.delete()
            msg = await message.channel.send(content = '%s >> %s'%(dispname, message.content), files = cfls,
                allowed_mentions=discord.AllowedMentions.none())
            await msg.add_reaction('❌')
            imgdc[msg] = message.author.id

class Core(commands.Cog):
    def __init__(self, app):
        self.app = app

    @commands.Cog.listener()
    async def on_message(self, message):
        global db
        if message.author.bot: return
        if message.channel in db.igcnls: return
        if await filter_message(message):
            await message.delete()
            return
        if len(message.attachments): await attach_mdr(message)
        await autoreact(message)

    @commands.Cog.listener()
    async def on_reaction_add(self, reaction, user):
        global db, imgdc
        if user.bot: return
        if reaction.message in imgdc and reaction.emoji == '❌':
            if user.id == imgdc[reaction.message]:
                del imgdc[reaction.message]
                await reaction.message.delete()
                return
        if user.top_role.name in ["서버장", "대장"]: return
        if reaction.message.channel in db.igcnls: return
        if reaction.emoji == '🖕':
            await reaction.clear()
            await middle_finger_report(user.id, reaction.message.channel)

    @commands.Cog.listener()
    async def on_reaction_remove(self, reaction, user):
        global db
        if user.bot: return
        if reaction.message.channel in db.igcnls: return
        if db.cnls['emojilog'] != None:
            embed = discord.Embed(description='From %s, <@%d> removed this emoji ⬇'%(reaction.message.jump_url, user.id))
            msg = await db.cnls['emojilog'].send(embed=embed)
            await msg.add_reaction(reaction)
