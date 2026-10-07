# -*- coding: utf-8 -*-
"""РАЗОВАЯ миграция (выполнена 07.10.2026, повторно не запускать: перезапишет правки из админки).
Разовая миграция контента из массивов src/data/* в формат админки: один файл = одна сущность (src/cms/).
Запуск из site/: python3 scripts/migrate-to-cms.py
После миграции src/data/products и src/data/content больше не читаются сайтом (см. src/lib/data.ts)."""
import json, os, re, glob, shutil

import sys
if os.path.isdir(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'src', 'cms', 'products')) and '--force' not in sys.argv:
    sys.exit('src/cms уже заполнен из админки; миграция не нужна (флаг --force перезапишет правки)')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src', 'data')
OUT = os.path.join(ROOT, 'src', 'cms')

def load(path):
    with open(path, encoding='utf-8') as fh:
        return json.load(fh)

def dump(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as fh:
        json.dump(obj, fh, ensure_ascii=False, indent=2)
        fh.write('\n')

def url_to_name(url):
    if url == '/': return 'home'
    return url.strip('/').replace('/', '--')

def conv_blocks(blocks):
    """Таблицы: строки и шапка хранятся строками с разделителем « | » (удобно править в админке)."""
    out = []
    for b in blocks or []:
        b = dict(b)
        if b.get('type') == 'table':
            b['head'] = ' | '.join(str(c) for c in b.get('head', []))
            b['rows'] = [' | '.join(str(c) for c in r) for r in b.get('rows', [])]
        if b.get('type') == 'checklist':
            b['items'] = [i if isinstance(i, str) else (i.get('text') or i.get('title') or '') for i in b.get('items', [])]
        out.append(b)
    return out

# настройки (src/cms/settings) создаются один раз и дальше правятся в админке: их не трогаем
for d in ('products', 'pages', 'brands', 'series', 'articles', 'service'):
    if os.path.isdir(os.path.join(OUT, d)): shutil.rmtree(os.path.join(OUT, d))

# ---------- товары: данные + тексты в одном файле
texts = {}
for f in glob.glob(os.path.join(SRC, 'content', 'products', '*.json')):
    for t in load(f):
        texts[t['slug']] = t
n = 0
seen = set()  # дубликат slug: как и раньше, побеждает первый по алфавиту файлов
for f in sorted(glob.glob(os.path.join(SRC, 'products', '*.json'))):
    for p in load(f):
        if not p.get('slug') or p['slug'] in seen: continue
        seen.add(p['slug'])
        t = texts.get(p['slug'], {})
        hidden = p.get('hidden')
        entry = {
            'slug': p['slug'], 'name': p['name'], 'brand': p['brand'], 'series': p.get('series'), 'order': n + 1,
            'category': p['category'], 'article': p.get('article'),
            'hidden': bool(hidden), 'hiddenNote': hidden if isinstance(hidden, str) else '',
            'variants': p.get('variants', []),
            'material': p.get('material'), 'style': p.get('style'), 'doorTypes': p.get('doorTypes', []),
            'specs': [{'k': k, 'v': str(v)} for k, v in (p.get('specs') or {}).items()],
            'description': p.get('description', ''),
            'intro': t.get('intro', ''), 'blocks': conv_blocks(t.get('blocks')), 'faq': t.get('faq', []),
            'sourceUrl': p.get('sourceUrl', ''),
        }
        dump(os.path.join(OUT, 'products', p['slug'] + '.json'), entry)
        n += 1
print('products', n)

# ---------- тексты разделов: pages.json (база) + sections/g*.json (блочные тексты поверх)
pages = {}
for t in load(os.path.join(SRC, 'content', 'pages.json')):
    pages[t['url']] = dict(t)
for f in sorted(glob.glob(os.path.join(SRC, 'content', 'sections', 'g*.json'))):
    for t in load(f):
        if t.get('url'):
            pages[t['url']] = {**pages.get(t['url'], {}), **t}
for url, t in pages.items():
    entry = {'url': url, 'title': t.get('title', ''), 'description': t.get('description', ''), 'h1': t.get('h1', ''),
             'lead': t.get('lead', ''), 'text': t.get('text', ''), 'blocks': conv_blocks(t.get('blocks')), 'faq': t.get('faq', [])}
    dump(os.path.join(OUT, 'pages', url_to_name(url) + '.json'), entry)
print('pages', len(pages))

# ---------- бренды, серии, статьи, служебные страницы
for b in load(os.path.join(SRC, 'content', 'brands.json')):
    cats = [{'slug': k, **v} for k, v in (b.get('categories') or {}).items()]
    entry = {k: v for k, v in b.items() if k != 'categories'}
    entry['categories'] = cats
    dump(os.path.join(OUT, 'brands', b['slug'] + '.json'), entry)
for s in load(os.path.join(SRC, 'content', 'series.json')):
    dump(os.path.join(OUT, 'series', s['slug'] + '.json'), s)
for i, a in enumerate(load(os.path.join(SRC, 'content', 'articles.json'))):
    dump(os.path.join(OUT, 'articles', a['slug'] + '.json'), {**a, 'order': i + 1})
for s in load(os.path.join(SRC, 'content', 'service.json')):
    dump(os.path.join(OUT, 'service', s['url'].strip('/') + '.json'), s)
dump(os.path.join(OUT, 'reviews.json'), load(os.path.join(SRC, 'content', 'reviews.json')))
print('brands/series/articles/service/reviews done')
