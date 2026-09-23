"""Builds Default Dinner.
  dist/default-dinner.html  standalone single file (Google Fonts)
  dist/artifact.html        body-only version for Claude artifacts
  <site>/index.html, sw.js, manifest.webmanifest   offline-capable hosted app (local fonts + icons)
Usage: python3 build.py [--site-dir site]
"""
import hashlib, json, pathlib, re, sys

site = pathlib.Path(sys.argv[sys.argv.index('--site-dir') + 1]) if '--site-dir' in sys.argv else pathlib.Path('site')
src = pathlib.Path('src')
shell = (src/'shell.html').read_text()
css = (src/'styles.css').read_text()
js = '\n'.join((src/f).read_text() for f in ['data.js','engine.js','views.js','app.js'])
icons = dict(re.findall(r"^\s+(\w+):'(<svg[^']*</svg>)',", (src/'views.js').read_text(), re.M))
for k in ['tonight','meals','sweet','prep','inventory','cart','clock']:
    shell = shell.replace(f'<!--ICON:{k}-->', icons[k])
GOOGLE = re.search(r'<link rel="preconnect" href="https://fonts.googleapis.com">.*?display=swap">\n', shell, re.S).group(0)

def page(body_shell, extra_head='', pre_script=''):
    body = body_shell.replace('<!--STYLE-->', f'<style>\n{css}\n</style>').replace('<!--SCRIPT-->', f'{pre_script}<script>\n{js}\n</script>')
    return body

meta = ('<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        '<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="mobile-web-app-capable" content="yes">\n'
        '<meta name="apple-mobile-web-app-title" content="Dinner">\n<meta name="apple-mobile-web-app-status-bar-style" content="default">\n'
        '<meta name="theme-color" content="#F2F3F0" media="(prefers-color-scheme: light)">\n<meta name="theme-color" content="#0E100F" media="(prefers-color-scheme: dark)">\n')

def document(body, head_extra=''):
    end = body.index('</style>') + len('</style>')
    return '<!doctype html>\n<html lang="en">\n<head>\n' + meta + head_extra + body[:end] + '\n</head>\n<body>\n' + body[end:] + '\n</body>\n</html>\n'

dist = pathlib.Path('dist')
if dist.parent.resolve() != site.resolve():
    dist.mkdir(exist_ok=True)
    art = page(shell)
    (dist/'artifact.html').write_text(art)
    (dist/'default-dinner.html').write_text(document(art))

# Hosted, offline-capable build
local_fonts = (src/'fonts-local.css').read_text()
hosted_shell = shell.replace(GOOGLE, f'<style>\n{local_fonts}</style>\n')
hosted = document(page(hosted_shell, pre_script='<script>window.__OFFLINE__ = true;</script>\n'),
                  head_extra='<link rel="manifest" href="manifest.webmanifest">\n<link rel="apple-touch-icon" href="icons/icon-180.png">\n<link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png">\n')
site.mkdir(exist_ok=True)
manifest = {
    "name": "Default Dinner", "short_name": "Dinner", "description": "Tonight's dinner, prep, desserts and kitchen inventory.",
    "start_url": "./", "scope": "./", "display": "standalone", "orientation": "portrait",
    "background_color": "#F2F3F0", "theme_color": "#F2F3F0",
    "icons": [
        {"src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png"},
        {"src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png"},
        {"src": "icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
    ],
}
manifest_text = json.dumps(manifest, indent=2) + '\n'
files = sorted(p for d in ('icons', 'fonts') for p in (site/d).glob('*') if p.is_file())
assets = ['./', './index.html', './manifest.webmanifest'] + ['./' + p.relative_to(site).as_posix() for p in files]
digest = hashlib.sha256(hosted.encode() + manifest_text.encode() + (src/'sw.js').read_bytes())
for p in files:
    digest.update(p.read_bytes())
version = digest.hexdigest()[:12]
# The service worker checks this marker to be sure it cached the matching page.
hosted = hosted.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<meta name="app-version" content="' + version + '">', 1)
(site/'index.html').write_text(hosted)
(site/'manifest.webmanifest').write_text(manifest_text)
sw = (src/'sw.js').read_text().replace('__VERSION__', version).replace('__ASSETS__', json.dumps(assets))
(site/'sw.js').write_text(sw)
print('built', 'version', version, '| index', len(hosted)//1024, 'KB |', len(assets), 'offline files')
