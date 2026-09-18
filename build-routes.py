#!/usr/bin/env python3
"""
Generate the route pages.

Every route IS the shell — the same document as index.html, so /trove/ renders
exactly what clicking the Trove tile renders. Nothing is designed twice and
nothing can drift, because these files are generated, never edited. The edits
made to each copy are:

  * relative asset paths rewritten to absolute, since the copy sits one
    directory down
  * that route's own <title>, description, canonical and OG tags
  * the study's prose lifted out of <slug>/case.html and written into the page
    as real HTML

That last one is what makes the site readable over plain HTTP. The shell paints
the case study by loading case.html into an iframe, which nothing without a
JavaScript engine can follow — crawlers and AI fetchers saw an empty frame. So
the same prose is also in the route page itself, removed by a synchronous
script on the line directly after it: it is in the served HTML, and it is gone
before the browser paints a single pixel. One source of truth (case.html), one
design, no second page.

Re-run after any change to index.html or a case file:  python3 build-routes.py
"""
import pathlib, re, html as _html

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
    # strip the shell's own head tags FIRST — doing it afterwards removed the
    # ones just inserted and left the homepage's canonical in place, which is
    # what made every route claim / as its master copy
    html = re.sub(r'\n\s*<meta name="description"[^>]*>', '', html)
    html = re.sub(r'\n\s*<link rel="canonical"[^>]*>', '', html)
    html = re.sub(r'\n\s*<meta property="og:[^>]*>', '', html)
    html = re.sub(r'\n\s*<meta name="twitter:card"[^>]*>', '', html)
    html = re.sub(r'<title>.*?</title>', lambda m: head, html, count=1, flags=re.S)
    return html

def readable(slug: str) -> str:
    """The study's own headings and paragraphs, in document order."""
    f = ROOT / slug / 'case.html'
    if not f.exists():
        return ''
    src = f.read_text()
    src = src[src.index('<body'):] if '<body' in src else src
    src = re.sub(r'<(script|style)[\s\S]*?</\1>', ' ', src)
    out, seen = [], set()
    for m in re.finditer(r'<(h1|h2|h3|h4|p|li)\b[^>]*>([\s\S]*?)</\1>', src):
        tag, inner = m.group(1), m.group(2)
        text = _html.unescape(re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', inner))).strip()
        if len(text) < 2 or text in seen:
            continue
        seen.add(text)
        out.append('<{0}>{1}</{0}>'.format(tag, _html.escape(text)))
    return '\n'.join(out)

def inject_readable(page: str, slug: str) -> str:
    prose = readable(slug)
    if not prose:
        return page
    # display:none as well as the removal — belt and braces. Unstyled h1/p/li
    # at the top of the document flashed as centred Times before the script
    # ran. A plain HTTP fetch reads the markup either way; it never evaluates
    # the CSS that hides it.
    block = ('<div id="http-readable" style="display:none">\n' + prose + '\n</div>\n'
             '<script>document.getElementById("http-readable").remove();</script>\n')
    return re.sub(r'(<body[^>]*>)', lambda m: m.group(1) + '\n' + block, page, count=1)

written = []
for slug, (title, desc) in ROUTES.items():
    out = absolutise(SHELL)
    out = retitle(out, slug, title, desc)
    out = inject_readable(out, slug)
    d = ROOT / slug
    d.mkdir(exist_ok=True)
    (d / 'index.html').write_text(out)
    written.append(slug)
print('route pages generated from the shell:', ', '.join(written))
