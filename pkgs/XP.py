from PIL import Image, ImageDraw, ImageFont
from io import BytesIO
import sys, requests, os, json, uuid

def level2xp(level):
    return (10 * level ** 3 + 135 * level ** 2 + 455 * level) // 6

def xp2level(xp):
    l, r = 0, 1001
    while r - l > 1:
        mid = (l + r) // 2
        if xp < level2xp(mid): r = mid
        else: l = mid
    return l

def GenTop(lst):
    res = Image.new("RGB", (1480 * 2 + 20, 280 * 10 + 20), (50, 50, 50))
    for i in range(len(lst)):
        data = lst[i]
        filename = GenFrame(data)
        img = Image.open(filename)
        os.remove(filename)
        res.paste(img, ((i // 10) * 1480, (i % 10) * 280))
    filename = f'{uuid.uuid4().hex}.png'
    res.save(filename)
    return filename

def GenFrame(data):
    xp = int(data['XP'])
    rank = int(data['rank'])
    name = data['name']
    if len(name) > 9: name = name[:8] + '...'
    level = xp2level(xp)
    if level == 1000: prop = 1
    else: prop = (xp - level2xp(level)) / (level2xp(level + 1) - level2xp(level))

    res = Image.new("RGB", (1500, 300), (50, 50, 50))
    canvas = ImageDraw.Draw(res)
    canvas.rectangle((0, 0, 1500, 300), outline = (70, 70, 70), width = 20)
    canvas.ellipse((1269, 69, 1431, 231), width = 6, outline = (80, 80, 80))
    canvas.text((1350, 120), 'LEVEL', font = ImageFont.truetype('NanumGothic.ttf', 30), fill = (140, 140, 140), align = 'center', anchor = 'mm')
    canvas.text((1110, 120), 'EXP', font = ImageFont.truetype('NanumGothic.ttf', 30), fill = (140, 140, 140), align = 'center', anchor = 'mm')

    if rank < 4: rankcolor = [(212, 175, 55), (208, 208, 208), (138, 84, 30)][rank - 1]
    else: rankcolor = (100, 100, 100)
    darkercolor = tuple(c - 20 for c in rankcolor)
    canvas.ellipse((75, 75, 225, 225), fill = rankcolor, width = 12, outline = darkercolor)
    if prop < 1:
        canvas.arc((1269, 69, 1431, 231), start = 270, end = int(270 + prop * 360) % 360, width = 6, fill = rankcolor if rank < 4 else (200, 200, 200))
    else: canvas.ellipse((1269, 69, 1431, 231), width = 6, outline = (255, 0, 0))
    canvas.text((150, 150), str(rank), font = ImageFont.truetype('NanumGothic.ttf', 90), fill = (255, 255, 255),
        anchor = 'mm', stroke_width = 4, stroke_fill = (0, 0, 0))
 
    if level == 1000: level = 'MAX'
    else: level = str(level)
    canvas.text((450, 150), name, font = ImageFont.truetype('NanumGothic.ttf', 60), fill = (255, 255, 255), anchor = 'lm')
    canvas.text((1350, 165), level, font = ImageFont.truetype('NanumGothic.ttf', 48), fill = (255, 255, 255), align = 'center', anchor = 'mm')
    xpstr = str(xp)
    if len(xpstr) > 3: xpstr = '%.1fk'%(xp / 1000)
    if len(xpstr) > 6: xpstr = '%.1fM'%(xp / 1000 ** 2)
    canvas.text((1110, 165), xpstr, font = ImageFont.truetype('NanumGothic.ttf', 48), fill = (255, 255, 255), anchor = 'mm')

    res.convert('RGBA')
    profile = Image.open(BytesIO(requests.get(data['AvatarUrl']).content))
    profile = profile.resize((120, 120))
    mask = Image.new('L', (120, 120), 0)
    mcanvas = ImageDraw.Draw(mask)
    mcanvas.ellipse((0, 0, 120, 120), fill = 255)
    res.paste(profile, (300, 90), mask = mask)

    filename = f'./{uuid.uuid4().hex}.png'
    res.save(filename)
    return filename

if __name__ == '__main__':
    with open(sys.argv[1], 'r') as fp: data = json.loads(fp.read())
    if type(data) == list: res = GenTop(data)
    else: res = GenFrame(data)
    print(res, end = '')
    sys.stdout.flush()
    os.remove(sys.argv[1])
