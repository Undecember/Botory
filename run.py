import discord, sys, os, pickle
from discord.ext import commands
from StudioBot.pkgs.DBCog import GDB
from StudioBot.cogs.Prefix import prefix_determiner
import cogs

app = commands.Bot(command_prefix = prefix_determiner, intents = discord.Intents.all(), help_command = None)

def main():
    global GDB
    GDB.requestDB('__global__')['StoryGuildID'] = 775210688183664640
    GDB.requestDB('__global__')['MemberRoleID'] = 821618440610643970
    InitCogs()
    app.run(GetToken())
    GDB.saveall()

def InitCogs():
    for CogName in cogs.__all__:
        __import__(f'cogs.{CogName}')
        getattr(sys.modules[f'cogs.{CogName}'], CogName)(app)

def GetToken():
    if os.path.isfile('token.db'):
        with open('token.db', 'rb') as f: return pickle.load(f)
    token = input('Enter token : ')
    with open('token.db', 'wb') as f: pickle.dump(token, f)
    return token

if __name__ == "__main__": main()
