#!/usr/bin/env python3
"""Genera variantes WebP y su índice para Jekyll; requiere Pillow con soporte WebP."""
import json
import re
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'images' / 'responsive'


def prepare():
    covers = set()
    for folder in ['_posts', '_projects']:
        for post in (ROOT / folder).glob('*.*'):
            match = re.search(r'^image:\s*[\'"]?([^\'"\s]+)', post.read_text(), re.M)
            if match:
                covers.add(match[1])
    OUTPUT.mkdir(exist_ok=True)
    catalog = {}
    expected = set()
    for source in sorted((ROOT / 'images').rglob('*')):
        if OUTPUT in source.parents or source.suffix.lower() not in {'.png', '.jpg', '.jpeg', '.webp'}:
            continue
        url = '/' + source.relative_to(ROOT).as_posix()
        with Image.open(source) as original:
            image = ImageOps.exif_transpose(original)
            if image.mode not in {'RGB', 'RGBA'}:
                image = image.convert('RGBA' if 'transparency' in image.info else 'RGB')
            relative = source.relative_to(ROOT / 'images')
            if 'social' in relative.parts:
                widths = ()
            elif 'badges' in relative.parts:
                widths = (100, 200)
            elif source.name == 'profile-ragalgut.jpeg':
                widths = (192, 384)
            elif url in covers or 'projects' in relative.parts:
                widths = (400, 800, 1200)
            else:
                widths = (740, 1480)
            variants = []
            for width in widths:
                if width >= image.width:
                    continue
                target = OUTPUT / relative.parent / f'{relative.stem}-{width}.webp'
                target.parent.mkdir(parents=True, exist_ok=True)
                height = round(image.height * width / image.width)
                if not target.exists() or target.stat().st_mtime < source.stat().st_mtime:
                    image.resize((width, height), Image.Resampling.LANCZOS).save(target, 'WEBP', quality=90, method=6)
                expected.add(target)
                variants.append({'src': '/' + target.relative_to(ROOT).as_posix(), 'width': width})
            fallback = next((v['src'] for v in variants if v['width'] >= min(740, image.width)), variants[-1]['src'] if variants else url)
            catalog[url] = {'width': image.width, 'height': image.height, 'fallback': fallback, 'variants': variants}
    for orphan in OUTPUT.rglob('*.webp'):
        if orphan not in expected:
            orphan.unlink()
    (ROOT / '_data' / 'images.json').write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n')
    print(f'{len(catalog)} imágenes originales; {len(expected)} variantes preparadas.')


if __name__ == '__main__':
    prepare()
