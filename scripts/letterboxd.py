#!/usr/bin/env python3
"""
Descarga el diario público de Letterboxd (RSS) y lo guarda en data/letterboxd.json
para que Joi lo muestre. Solo usa la librería estándar de Python.

Lo ejecuta cada hora la tarea .github/workflows/letterboxd.yml.
Uso manual:  LB_USER=marcus_cus python3 scripts/letterboxd.py
"""
import json
import os
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET

USER = os.environ.get('LB_USER', 'marcus_cus')
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data', 'letterboxd.json')
MAX_FILMS = 20


def local(tag):
    """Nombre de la etiqueta sin el espacio de nombres ({https://letterboxd.com}filmTitle -> filmTitle)."""
    return tag.split('}', 1)[-1]


def fields(item):
    return {local(child.tag): (child.text or '').strip() for child in item}


def parse(xml_text):
    root = ET.fromstring(xml_text)
    films, seen = [], set()
    for item in root.iter('item'):
        f = fields(item)
        title = f.get('filmTitle')
        if not title:                       # entradas que no son películas (listas, etc.)
            continue
        url = f.get('link', '')
        # Una misma película puede salir varias veces si la has vuelto a ver: nos quedamos con la última.
        key = re.sub(r'/\d+/?$', '/', url) or title
        if key in seen:
            continue
        seen.add(key)
        poster = ''
        m = re.search(r'<img[^>]+src="([^"]+)"', f.get('description', ''))
        if m:
            poster = m.group(1)
        rating = f.get('memberRating')
        films.append({
            'title': title,
            'year': f.get('filmYear', ''),
            'rating': float(rating) if rating else None,
            'liked': f.get('memberLike', '').lower() == 'yes',
            'rewatch': f.get('rewatch', '').lower() == 'yes',
            'watched': f.get('watchedDate', ''),
            'poster': poster,
            'url': url,
        })
        if len(films) >= MAX_FILMS:
            break
    return films


def main():
    url = 'https://letterboxd.com/%s/rss/' % USER
    req = urllib.request.Request(url, headers={
        'User-Agent': 'Mozilla/5.0 (Joi TV launcher; +https://github.com/marcuscuss/tv)',
        'Accept': 'application/rss+xml, application/xml;q=0.9, */*;q=0.8',
    })
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            films = parse(r.read())
    except Exception as e:
        # Si Letterboxd no responde, se conservan los datos anteriores.
        print('AVISO: no se pudo leer %s: %s' % (url, e), file=sys.stderr)
        return 0 if os.path.exists(OUT) else 1

    data = {'user': USER, 'profile': 'https://letterboxd.com/%s/' % USER, 'films': films}

    old = None
    if os.path.exists(OUT):
        try:
            with open(OUT, encoding='utf-8') as fh:
                old = json.load(fh)
        except ValueError:
            old = None
    if old == data:
        print('Sin cambios (%d películas).' % len(films))
        return 0

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as fh:
        json.dump(data, fh, ensure_ascii=False, indent=1)
        fh.write('\n')
    print('Guardadas %d películas de %s.' % (len(films), USER))
    return 0


if __name__ == '__main__':
    sys.exit(main())
