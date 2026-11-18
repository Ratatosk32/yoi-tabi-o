"""Contact sheets of design/shots/ux/<label>/ for review: python ux-contact.py <label> [size] [theme]"""
import pathlib, sys
from PIL import Image
label = sys.argv[1]; size = sys.argv[2] if len(sys.argv) > 2 else "412x915"; theme = sys.argv[3] if len(sys.argv) > 3 else "light"
D = pathlib.Path(__file__).resolve().parents[1] / "shots" / "ux" / label
files = sorted(D.glob(f"*-{size}-{theme}.png"))
short = [f for f in files if Image.open(f).size[1] <= 2000]
tall = [f for f in files if f not in short]
def sheet(group, out, per=5):
    for k in range(0, len(group), per):
        ims = [Image.open(f) for f in group[k:k + per]]
        ims = [im.resize((im.size[0] // 2, im.size[1] // 2), Image.LANCZOS) for im in ims]
        H = max(im.size[1] for im in ims); W = sum(im.size[0] + 12 for im in ims) + 12
        S = Image.new("RGB", (W, H + 24), "#8a8a8a"); x = 12
        for im in ims: S.paste(im, (x, 12)); x += im.size[0] + 12
        name = D / f"_{out}-{theme}-{k // per + 1}.png"; S.save(name); print(name.name, [f.name.split('-' + size)[0] for f in group[k:k + per]])
sheet(short, "sheet"); sheet(tall, "tall", 4)
