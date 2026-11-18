"""WCAG contrast audit of the palette. Run: python design/tools/contrast.py"""
import sys
sys.stdout.reconfigure(encoding="utf-8")
def lum(h):
    h=h.lstrip('#'); r,g,b=[int(h[i:i+2],16)/255 for i in (0,2,4)]
    f=lambda c: c/12.92 if c<=0.03928 else ((c+0.055)/1.055)**2.4
    return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b)
def cr(a,b):
    la,lb=lum(a),lum(b); 
    if la<lb: la,lb=lb,la
    return (la+0.05)/(lb+0.05)
def mix(fg,bg,a):
    fg=fg.lstrip('#'); bg=bg.lstrip('#')
    return '#'+''.join(f"{round(int(fg[i:i+2],16)*a+int(bg[i:i+2],16)*(1-a)):02x}" for i in (0,2,4))
T={
 'light':dict(paper='#f5f1e7',surface='#fdfbf6',fill='#ebe5d7',line='#ddd5c4',line_strong='#bfb5a0',
   ink='#1c1a17',ink2='#46423b',ink3='#676257',ink4='#857e70',
   shu='#c23a2b',shu_text='#a83222',ai='#2b4c7e',matsu='#3d6a4c',enji='#9b3a32',kin='#7a5c14',on_shu='#fffaf3',on_ink='#f5f1e7'),
 'dark':dict(paper='#171613',surface='#201f1b',fill='#2a2823',line='#3a372f',line_strong='#575245',
   ink='#ece6d8',ink2='#c9c2b1',ink3='#a19a8a',ink4='#7d7768',
   shu='#cc4532',shu_text='#f08a75',ai='#9bb8de',matsu='#8fbf9c',enji='#f0958a',kin='#d9b765',on_shu='#fffaf3',on_ink='#171613'),
}
for name,t in T.items():
    print('==',name)
    for fg in ('ink','ink2','ink3','shu_text','ai','matsu','enji','kin'):
        print(f"  {fg:9s} {t[fg]}  " + '  '.join(f"{bg}:{cr(t[fg],t[bg]):5.2f}" for bg in ('paper','surface','fill')))
    for fg in ('ink4','line_strong','shu'):
        print(f"  {fg:11s} (graphics >=3) " + '  '.join(f"{bg}:{cr(t[fg],t[bg]):5.2f}" for bg in ('paper','surface','fill')))
    print(f"  on_shu/shu {cr(t['on_shu'],t['shu']):.2f}   on_ink/ink {cr(t['on_ink'],t['ink']):.2f}")
    for k in ('matsu','enji','ai','kin'):
        w=mix(t[k],t['surface'],0.12 if name=='light' else 0.18)
        print(f"  wash {k} {w}: ink {cr(t['ink'],w):.2f}  own {cr(t[k],w):.2f}")
print('show card: #000 on #fff', cr('#000000','#ffffff'), ' caption #555:', round(cr('#555555','#ffffff'),2))
