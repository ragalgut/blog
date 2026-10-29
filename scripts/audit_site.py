#!/usr/bin/env python3
"""Comprueba SEO, estructura y enlaces del sitio generado, sin dependencias externas."""
import argparse
import json
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit
import xml.etree.ElementTree as ET


class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids = []
        self.refs = []
        self.images = []
        self.titles = []
        self.descriptions = []
        self.canonicals = []
        self.headings = []
        self.schemas = []
        self.aria_refs = []
        self.errors = []
        self.in_head = self.in_main = self.in_title = self.in_schema = False
        self.text = ''
        self.lang = ''
        self.noindex = False
        self.tool = False
        self.csp = ''

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'html': self.lang = attrs.get('lang')
        if tag == 'head': self.in_head = True
        if tag == 'main': self.in_main = True
        if tag == 'title':
            self.in_title = True
            self.text = ''
            if not self.in_head: self.errors.append('El título está fuera de head')
        if tag == 'meta':
            if not self.in_head: self.errors.append('Metadato fuera de head')
            if attrs.get('name') == 'description': self.descriptions.append(attrs.get('content', ''))
            if attrs.get('name') == 'robots' and 'noindex' in attrs.get('content', ''): self.noindex = True
            if attrs.get('http-equiv', '').lower() == 'content-security-policy': self.csp = attrs.get('content', '')
        if 'data-password-tool' in attrs: self.tool = True
        if tag == 'link' and attrs.get('rel') == 'canonical': self.canonicals.append(attrs.get('href', ''))
        if attrs.get('id'): self.ids.append(attrs['id'])
        for key in ['aria-labelledby', 'aria-describedby', 'aria-controls']:
            self.aria_refs.extend(attrs.get(key, '').split())
        if self.in_main and re.fullmatch(r'h[1-6]', tag): self.headings.append(int(tag[1]))
        if tag == 'img': self.images.append(attrs)
        if tag in {'img', 'source'} and attrs.get('srcset'):
            if not attrs.get('sizes'): self.errors.append('Imagen adaptable sin sizes')
            for candidate in attrs['srcset'].split(','):
                parts = candidate.strip().split()
                if len(parts) != 2 or not re.fullmatch(r'\d+w', parts[1]): self.errors.append('Candidato srcset inválido')
                elif parts: self.refs.append(('img', parts[0]))
        if attrs.get('data-full-src'): self.refs.append(('img', attrs['data-full-src']))
        if tag == 'a' and not attrs.get('href'): self.errors.append('Enlace sin destino')
        if tag in {'a', 'link', 'script', 'img', 'iframe', 'source'}:
            ref = attrs.get('href') if tag in {'a', 'link'} else attrs.get('src')
            if ref: self.refs.append((tag, ref))
        if tag == 'script' and attrs.get('type') == 'application/ld+json': self.in_schema = True; self.text = ''

    def handle_endtag(self, tag):
        if tag == 'head': self.in_head = False
        if tag == 'main': self.in_main = False
        if tag == 'title' and self.in_title:
            self.titles.append(self.text.strip()); self.in_title = False
        if tag == 'script' and self.in_schema:
            try: self.schemas.append(json.loads(self.text))
            except ValueError: self.errors.append('JSON-LD inválido')
            self.in_schema = False

    def handle_data(self, data):
        if self.in_title or self.in_schema: self.text += data


def audit(destination, baseurl):
    pages = {}
    errors = []
    for path in destination.rglob('*.html'):
        page = Page()
        page.feed(path.read_text())
        pages[path] = page
        if page.lang != 'es': page.errors.append('Falta el idioma español')
        if len(page.titles) != 1 or not page.titles[0]: page.errors.append('Se requiere un único título no vacío')
        if len(page.descriptions) != 1 or not page.descriptions[0]: page.errors.append('Se requiere una única metadescripción')
        if len(page.canonicals) != 1 or not page.canonicals[0].startswith('https://ragalgut.me/'): page.errors.append('Canónica ausente, duplicada o no productiva')
        if page.headings.count(1) != 1: page.errors.append('Se requiere exactamente un H1 en el contenido')
        previous = 0
        for level in page.headings:
            if level > previous + 1: page.errors.append(f'Salto de cabeceras H{previous} → H{level}')
            previous = level
        if len(set(page.ids)) != len(page.ids): page.errors.append('Identificadores HTML duplicados')
        if any(re.search(r'\s', value) for value in page.ids): page.errors.append('Identificador HTML con espacios')
        for ref in page.aria_refs:
            if ref not in page.ids: page.errors.append(f'Referencia de accesibilidad inexistente: {ref}')
        if not page.schemas: page.errors.append('Faltan datos estructurados')
        if page.tool:
            if "script-src 'self'" not in page.csp or "connect-src 'self'" not in page.csp: page.errors.append('Herramienta sin la política de recursos locales')
            if any(tag == 'script' and urlsplit(ref).netloc for tag, ref in page.refs): page.errors.append('La herramienta carga scripts externos')
        for image in page.images:
            if 'alt' not in image: page.errors.append(f'Imagen sin alt: {image.get("src")}')
            if not image.get('width', '').isdigit() or not image.get('height', '').isdigit(): page.errors.append(f'Imagen sin dimensiones: {image.get("src")}')
        for schema in page.schemas:
            for entity in schema.get('@graph', []):
                if entity.get('@type') == 'BlogPosting':
                    for key in ['headline', 'articleSection', 'image', 'datePublished', 'dateModified', 'author', 'mainEntityOfPage']:
                        if not entity.get(key): page.errors.append(f'BlogPosting sin {key}')

    def resolve(path):
        path = unquote(path)
        if baseurl:
            if not path.startswith(baseurl + '/') and path != baseurl: return None
            path = path[len(baseurl):]
        candidate = destination / path.lstrip('/')
        for target in [candidate, candidate / 'index.html', Path(str(candidate) + '.html')]:
            if target.is_file(): return target
        return None

    for path, page in pages.items():
        relative = '/' + path.relative_to(destination).as_posix()
        if relative.endswith('index.html'): relative = relative[:-10]
        page_url = 'https://ragalgut.me' + baseurl + relative
        for tag, ref in page.refs:
            url = urlsplit(urljoin(page_url, ref))
            if url.scheme not in {'http', 'https'} or url.netloc != 'ragalgut.me': continue
            target = resolve(url.path)
            if target is None:
                page.errors.append(f'Recurso o enlace local inexistente: {ref}')
            elif tag == 'a' and url.fragment and target in pages and unquote(url.fragment) not in pages[target].ids:
                page.errors.append(f'Ancla inexistente: {ref}')
        for message in set(page.errors): errors.append(f'{path.relative_to(destination)}: {message}')

    titles = [page.titles[0] for page in pages.values() if page.titles and not page.noindex]
    descriptions = [page.descriptions[0] for page in pages.values() if page.descriptions and not page.noindex]
    if len(titles) != len(set(titles)): errors.append('Títulos repetidos entre páginas indexables')
    if len(descriptions) != len(set(descriptions)): errors.append('Descripciones repetidas entre páginas indexables')
    for name in ['feed.xml', 'sitemap.xml']:
        try: ET.parse(destination / name)
        except (OSError, ET.ParseError) as error: errors.append(f'{name}: {error}')
    try:
        index = json.loads((destination / 'search.json').read_text())
        for post in index:
            if not post['title'] or not resolve(urlsplit(post['url']).path): errors.append('Índice de búsqueda con artículo inválido')
            if not isinstance(post.get('topic'), str) or not post['topic'].strip(): errors.append('Artículo sin un tema principal válido en el índice de búsqueda')
    except (OSError, ValueError, KeyError) as error: errors.append(f'Índice de búsqueda inválido: {error}')
    for path in destination.rglob('*'):
        if path.suffix in {'.js', '.mjs', '.css'}:
            for ref in re.findall(r"(?:from\s*|import\s*)['\"]([^'\"]+)['\"]", path.read_text()):
                if ref.startswith('.') and not (path.parent / ref).is_file(): errors.append(f'{path.name}: importación inexistente {ref}')
    if errors:
        print('\n'.join(sorted(errors)))
        raise SystemExit(f'Falló la auditoría: {len(errors)} incidencias')
    print(f'Auditoría correcta: {len(pages)} páginas, {sum(len(p.images) for p in pages.values())} imágenes, enlaces internos, SEO, JSON-LD, búsqueda, sitemap y feed.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('destination', type=Path, nargs='?', default=Path('_site'))
    parser.add_argument('--baseurl', default='')
    args = parser.parse_args()
    audit(args.destination.resolve(), args.baseurl.rstrip('/'))
