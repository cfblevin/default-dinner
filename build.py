import re, pathlib
src = pathlib.Path("src")
shell = (src/'shell.html').read_text()
css = (src/'styles.css').read_text()
js = '\n'.join((src/f).read_text() for f in ['data.js','engine.js','views.js','app.js'])
views = (src/'views.js').read_text()
icons = dict(re.findall(r"^\s+(\w+):'(<svg[^']*</svg>)',", views, re.M))
for k in ['tonight','meals','sweet','prep','inventory']:
    shell = shell.replace(f'<!--ICON:{k}-->', icons[k])
body = shell.replace('<!--STYLE-->', f'<style>\n{css}\n</style>').replace('<!--SCRIPT-->', f'<script>\n{js}\n</script>')
dist = pathlib.Path('dist'); dist.mkdir(exist_ok=True)
(dist/'artifact.html').write_text(body)
head_meta = '<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-title" content="Dinner">\n<meta name="theme-color" content="#F2F3F0" media="(prefers-color-scheme: light)">\n<meta name="theme-color" content="#0E100F" media="(prefers-color-scheme: dark)">\n'
title_end = body.index('</style>') + len('</style>')
full = '<!doctype html>\n<html lang="en">\n<head>\n' + head_meta + body[:title_end] + '\n</head>\n<body>\n' + body[title_end:] + '\n</body>\n</html>\n'
(dist/'default-dinner.html').write_text(full)
print('built', len(full)//1024, 'KB')
