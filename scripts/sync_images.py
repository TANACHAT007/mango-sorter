"""Copy the project's renders / flowcharts / wiring diagram into public/img as web-sized JPEGs.
Run after every CAD build:  python scripts/sync_images.py   (then commit + push to redeploy)"""
import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
PROJ = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(HERE, '..', 'public', 'img')
os.makedirs(OUT, exist_ok=True)
P = 'mango-sorting-conveyor_'
RENDERS = ['iso', 'cu_weigh', 'cu_tunnel_paddle', 'cu_inside_tunnel', 'cu_servo_mount', 'cu_chute_hanger', 'cu_drive', 'cu_encoder',
           'cu_cabinet', 'cu_cabinet_boards', 'cu_back_side', 'front', 'top', 'right']
jobs = [(os.path.join(PROJ, '03_renders', P + r + '.png'), r, 1600) for r in RENDERS]
fc = os.path.join(PROJ, '10_manual', 'flowcharts')
if os.path.isdir(fc):
    jobs += [(os.path.join(fc, f), 'flow_' + os.path.splitext(f)[0], 1800) for f in sorted(os.listdir(fc)) if f.endswith('.png')]
jobs.append((os.path.join(PROJ, '10_manual', 'wiring.png'), 'wiring', 2400))
done = []
for src, name, wmax in jobs:
    if not os.path.exists(src):
        print('missing', os.path.basename(src))
        continue
    im = Image.open(src).convert('RGBA')
    bg = Image.new('RGB', im.size, (255, 255, 255))
    bg.paste(im, mask=im.split()[3])
    if bg.width > wmax:
        bg = bg.resize((wmax, round(bg.height * wmax / bg.width)), Image.LANCZOS)
    bg.save(os.path.join(OUT, name + '.jpg'), quality=82, optimize=True, progressive=True)
    done.append(name)
# the page reads this list, so it never shows an empty frame for an image that does not exist
import json
json.dump(done, open(os.path.join(OUT, 'index.json'), 'w'))
print(len(done), 'images ->', os.path.normpath(OUT))
