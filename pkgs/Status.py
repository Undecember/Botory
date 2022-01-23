from PIL import Image, ImageDraw, ImageFont
import uuid, os, sys, json, requests
from io import BytesIO

DB = dict()

def GenImages(boosters):
    global DB
    if len(boosters) == 0: return 'none'
    arng, sz = GetBestArrangement(len(boosters))
    img = DB['background'].resize((3000, len(arng) * sz))
    index = 0
    dy = (img.height + sz) // (len(arng) + 1)
    y = dy - sz
    for i in range(len(arng)):
        dx = (img.width + sz) // (arng[i] + 1)
        x = dx - sz
        for j in range(arng[i]):
            img.paste(GenFrame(boosters[index], sz), (x, y))
            x += dx
            index += 1
        y += dy
    cheight = 2250 // sz * sz
    cuts = [0]
    if cheight > 0:
        for i in range(1, 9):
            if cheight * i >= img.height: break
            cuts.append(cheight * i)
    cuts.append(img.height)
    imgs = [DB['header']]
    for i in range(len(cuts) - 1):
        imgs.append(img.crop((0, cuts[i], 3000, cuts[i + 1])))
    res = []
    for img in imgs:
        filename = f'{uuid.uuid4().hex}.png'
        res.append(filename)
        img.save(filename)
    filename = f'{uuid.uuid4().hex}.json'
    with open(filename, 'w') as fp:
        json.dump({'images' : res}, fp)
    return f'../{filename}'

def GetBestArrangement(n):
    if n == 1: return [1], 2250
    arng, sz = [], 0
    for h in range(1, n):
        _arng = [n // h] * h
        for j in range(n % h): _arng[j] += 1
        _sz = min([3000 // _arng[0], 5000 // h])
        if _sz > sz: arng, sz = _arng, _sz
    return arng, sz

def GenFrame(booster, length):
    avatarURL = booster['avatarURL']
    name = booster['name']
    tplt = DB['template'].copy()
    ret = Image.new('RGBA', tplt.size, color = (0, 0, 0, 0))
    l, r, t, b = tplt.width + 1, -1, tplt.height + 1, -1
    for x in range(tplt.width):
        for y in range(tplt.height):
            if tplt.load()[x, y][3] == 0:
                l = min([x, l])
                r = max([x, r])
                t = min([y, t])
                b = max([y, b])
    assert r >= 0
    pf = Image.open(BytesIO(requests.get(avatarURL).content)).convert('RGBA').resize((r - l + 1, b - t + 1))
    ret.paste(pf, (l, t))
    ret.alpha_composite(tplt)
    textimg = Image.new('RGBA', tplt.size, color = (0, 0, 0, 0))
    canvas = ImageDraw.Draw(textimg)
    if len(name) > 9: name = name[:8] + '...'
    canvas.text((textimg.width // 2, int(textimg.height * 0.8)), name, font = ImageFont.truetype('NanumGothic.ttf', 65),
        fill = (255, 0, 255, 255), align = 'center', anchor = 'mm', stroke_width = 2)
    ret.alpha_composite(textimg)
    return ret.resize((length, length))

if __name__ == '__main__':
    for key in ['background', 'template', 'header']: DB[key] = Image.open(f'resources/images/{key}.png').convert('RGBA')
    with open(sys.argv[1], 'r') as fp: boosters = json.loads(fp.read())['data']
    print(GenImages(boosters), end = '')
    sys.stdout.flush()
    os.remove(sys.argv[1])
