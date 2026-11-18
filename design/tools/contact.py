"""Contact sheets of the screenshots (for review). Run with the venv python."""
import pathlib, sys
from PIL import Image
D = pathlib.Path(__file__).resolve().parents[1] / "shots"
ALL = ['phrases','phrase-open','show','show-list','study','kana','quiz','flash','price','kanji','tools','states','phrases-flat']
def sheet(names, size, theme, out):
    ims = [Image.open(D / f"{n}-{size}-{theme}.png") for n in names]
    w, h = ims[0].size; w2, h2 = w // 2, h // 2
    S = Image.new("RGB", (len(ims) * (w2 + 16) + 16, h2 + 32), "#8a8a8a")
    for i, im in enumerate(ims):
        S.paste(im.resize((w2, h2), Image.LANCZOS), (16 + i * (w2 + 16), 16))
    S.save(D / out); print(out)
for theme in ("light", "dark"):
    sheet(ALL[:4], "412x915", theme, f"overview-1-{theme}.png")
    sheet(ALL[4:8], "412x915", theme, f"overview-2-{theme}.png")
    sheet(ALL[8:], "412x915", theme, f"overview-3-{theme}.png")
sheet(ALL[:4], "430x932", "light", "overview-iphone-430x932-light.png")
