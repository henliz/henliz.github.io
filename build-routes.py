#!/usr/bin/env python3
"""
Generate the route pages.

Every route IS the shell — byte-for-byte the same document as index.html, so
/trove/ renders exactly what clicking the Trove tile renders. There is no
second design, no reconstruction and no fallback page to drift out of sync.
The only edits made to each copy are:

  * relative asset paths rewritten to absolute, since the copy sits one
    directory down
  * that route's own <title>, description, canonical and OG tags

Re-run this after any change to index.html:   python3 build-routes.py
"""
import pathlib, re, shutil

ROOT = pathlib.Path(__file__).parent
SHELL = (ROOT / 'index.html').read_text()

ROUTES = {
 'trove':   ("Trove — Henriëtta van Niekerk",
   "Turning behavioural data into a personality read people actually recognise. Trove grew 0 to 10,250 users and 61.9K page views in six months. Design engineering case study by Henriëtta van Niekerk."),
 'skrimp':  ("Skrimp — Henriëtta van Niekerk",
   "Planning a week of dinners around live grocery prices and whatever is already in the fridge. Skrimp compares live flyer data across 15+ Canadian retailers and saves families $50-$100 a week, free always."),
 'menzo':   ("Path to Menzoberranzan — Henriëtta van Niekerk",
   "Running a volunteer studio of 140+ contributors on an undocumented engine, funded by 1,700 Patreon members. Technical direction case study by Henriëtta van Niekerk, CTO."),
 'myauntie':("MyAuntie — Henriëtta van Niekerk",
   "Postpartum support that arrives as a text, not another app to download. TechNova 2025 winner: concept to live telephony in 36 hours."),
 'equinox': ("Equinox — Henriëtta van Niekerk",
   "Reading Overcomplicated Screen Transitions as a design constraint, not decoration. First of 88 at Comfy Jam Winter 2026."),
 'about':   ("About — Henriëtta van Niekerk",
   "Henriëtta van Niekerk is a design engineer and founder in Waterloo, Ontario, building systems that carry the load instead of the person."),
 'playground':("Playground — Henriëtta van Niekerk",
   "Experiments, sketches and the offcuts that never became a case study."),
 'resume':  ("Résumé — Henriëtta van Niekerk",
   "Résumé for Henriëtta van Niekerk, design engineer. Founder of Skrimp, CTO of Path to Menzoberranzan."),
}

# every directory the shell loads assets from, so a copy one level down
# still finds them
ASSET_DIRS = ('models','field','scenes','mascots','fonts','css','js',
              'equinox','trove','skrimp','menzo','myauntie','about','playground','resume')

def absolutise(html: str) -> str:
    html = html.replace('"./', '"/').replace("'./", "'/")
    for d in ASSET_DIRS:
        html = re.sub(r'(["\'(])' + d + r'/', r'\g<1>/' + d + '/', html)
    for f in ('HenLogo.png','loading.gif','Henrietta_van_Niekerk_Resume_2026.pdf',
              'SkrimpCelebrate.png','SkrimpThinking.png'):
        html = html.replace('"' + f + '"', '"/' + f + '"')
        html = html.replace("'" + f + "'", "'/" + f + "'")
    return html

def retitle(html: str, slug: str, title: str, desc: str) -> str:
    head = (f'<title>{title}</title>\n'
            f'    <meta name="description" content="{desc}">\n'
            f'    <link rel="canonical" href="https://henliz.github.io/{slug}/">\n'
            f'    <meta property="og:type" content="article">\n'
            f'    <meta property="og:title" content="{title}">\n'
            f'    <meta property="og:description" content="{desc}">\n'
            f'    <meta property="og:url" content="https://henliz.github.io/{slug}/">\n'
            f'    <meta name="twitter:card" content="summary_large_image">')
    html = re.sub(r'<title>.*?</title>', head, html, count=1, flags=re.S)
    html = re.sub(r'\n\s*<meta name="description"[^>]*>', '', html, count=1)
    html = re.sub(r'\n\s*<link rel="canonical"[^>]*>', '', html, count=1)
    html = re.sub(r'\n\s*<meta property="og:[^>]*>', '', html)
    html = re.sub(r'\n\s*<meta name="twitter:card"[^>]*>', '', html, count=1)
    return html

written = []
for slug, (title, desc) in ROUTES.items():
    out = absolutise(SHELL)
    out = retitle(out, slug, title, desc)
    d = ROOT / slug
    d.mkdir(exist_ok=True)
    (d / 'index.html').write_text(out)
    written.append(slug)
print('route pages generated from the shell:', ', '.join(written))
