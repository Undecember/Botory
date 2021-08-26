from flask import *
from flask_discord import DiscordOAuth2Session, requires_authorization
from flask_recaptcha import ReCaptcha
from waitress import serve
import os, pickle, uuid

app = Flask(__name__)
app.secret_key = uuid.uuid4().hex

if not os.path.isfile('oauth.db'):
    db = dict()
    for key in ['DISCORD_CLIENT_ID', 'DISCORD_CLIENT_SECRET', 'DISCORD_BOT_TOKEN', 'DISCORD_REDIRECT_URI', 'RECAPTCHA_SITE_KEY', 'RECAPTCHA_SECRET_KEY']:
        db[key] = input(f'{key}:')
    db['DISCORD_CLIENT_ID'] = int(db['DISCORD_CLIENT_ID'])
    pickle.dump(db, open('oauth.db', 'wb'))
db = pickle.load(open('oauth.db', 'rb'))
for key in db: app.config[key] = db[key]

os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'
discord = DiscordOAuth2Session(app)
recaptcha = ReCaptcha(app)

@app.route('/', methods = ['GET', 'POST'])
async def index():
    discord.revoke()
    return render_template('index.html')

@app.route('/login/')
async def login():
    return discord.create_session(scope = ['identify', 'guilds', 'guilds.join'])

@app.route('/callback/')
async def callback():
    data = discord.callback()
    redirect_to = data.get('redirect', '/join')
    return redirect(redirect_to)

@app.route('/join/', methods = ['GET', 'POST'])
async def join():
    if request.method == 'POST':
        if recaptcha.verify():
            user = discord.fetch_user()
            user.add_to_guild(775210688183664640)
            discord.revoke()
            return redirect(url_for('.end'))
    return render_template('join.html')

@app.route('/success/')
async def end():
    return render_template('final.html')

if __name__ == '__main__': serve(app, host = '0.0.0.0', port = 80)
