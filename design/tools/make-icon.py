"""Build the app icon SVGs (the glyph 旅 is converted to an outline, so the SVG
needs no font). Run: design/tools/.venv/Scripts/python design/tools/make-icon.py
PNG rendering is done by tools/render-icons.mjs (headless Chrome)."""
import io, pathlib
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

D = pathlib.Path(__file__).resolve().parents[1]
font = TTFont(D / "fonts" / "src" / "shipporimincho-ShipporiMincho-Medium.ttf")
GLYPH = "旅"
gs = font.getGlyphSet(); name = font.getBestCmap()[ord(GLYPH)]
upm = font["head"].unitsPerEm

def glyph_path(size, cx, cy):
    """outline of GLYPH, `size` px tall em-box, centred on (cx, cy), y flipped"""
    k = size / upm
    asc, desc = 880, -120          # CJK em-box in a 1000-unit em
    k2 = k * upm / 1000
    pen = SVGPathPen(gs)
    # x' = k*x + cx - size/2 ; y' = -k*y + cy + size*(asc)/(asc-desc) - size/2 ... em-box centred
    t = (k, 0, 0, -k, cx - size / 2, cy - size / 2 + size * asc / (asc - desc))
    gs[name].draw(TransformPen(pen, t))
    return pen.getCommands()

PAPER, SHU, ON = "#f5f1e7", "#c23a2b", "#fffaf3"

def svg(seal, maskable):
    c = 256; h = seal / 2; r = seal * .085; inset = seal * .07
    path = glyph_path(seal * .72, c, c + seal * .012)
    corner = "" if maskable else ' rx="96"'
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <title>Japan Trip</title>
  <defs>
    <radialGradient id="light" cx="38%" cy="30%" r="85%">
      <stop offset="0" stop-color="#fffdf8" stop-opacity=".75"/>
      <stop offset="1" stop-color="#e4dccb" stop-opacity=".55"/>
    </radialGradient>
    <!-- the pressed-ink edge of a real seal: slightly uneven, a few dry specks -->
    <filter id="ink" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="2" seed="3" result="t"/>
      <feDisplacementMap in="SourceGraphic" in2="t" scale="7" result="d"/>
      <feTurbulence type="fractalNoise" baseFrequency=".22" numOctaves="2" seed="8" result="s"/>
      <feColorMatrix in="s" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -24 6.4" result="holes"/>
      <feComposite in="d" in2="holes" operator="out"/>
    </filter>
    <clipPath id="tile"><rect width="512" height="512"{corner}/></clipPath>
  </defs>
  <g clip-path="url(#tile)">
    <rect width="512" height="512" fill="{PAPER}"/>
    <rect width="512" height="512" fill="url(#light)"/>
    <g transform="rotate(-4 {c} {c})" filter="url(#ink)">
      <rect x="{c-h:.1f}" y="{c-h:.1f}" width="{seal}" height="{seal}" rx="{r:.1f}" fill="{SHU}"/>
      <rect x="{c-h+inset:.1f}" y="{c-h+inset:.1f}" width="{seal-2*inset:.1f}" height="{seal-2*inset:.1f}" rx="{r*.55:.1f}" fill="none" stroke="{ON}" stroke-width="{seal*.014:.1f}" opacity=".9"/>
      <path d="{path}" fill="{ON}" stroke="{ON}" stroke-width="{seal*.013:.1f}" stroke-linejoin="round"/>
    </g>
  </g>
</svg>
'''
out = D / "icons"
io.open(out / "icon.svg", "w", encoding="utf-8", newline="\n").write(svg(344, False))
io.open(out / "icon-maskable.svg", "w", encoding="utf-8", newline="\n").write(svg(272, True))
io.open(out / "icon-square.svg", "w", encoding="utf-8", newline="\n").write(svg(344, True))   # full-bleed, for apple-touch-icon
print("ok", len(glyph_path(200, 256, 256)))
