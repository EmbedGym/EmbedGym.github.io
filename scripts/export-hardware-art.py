#!/usr/bin/env python3
"""Copy selected source-owned hardware artwork, with provenance and no redraws."""
import argparse
import hashlib
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

def export(source):
    public = source / 'frontend/public'
    destination = ROOT / 'public/hardware'
    destination.mkdir(parents=True, exist_ok=True)
    metadata = json.loads((public / 'components-metadata.json').read_text())['components']
    catalog = json.loads((ROOT / 'public/data/catalog.json').read_text())
    assets = {}
    for component in catalog['components']:
        name = component['id']
        candidates = [public / 'component-svgs' / f'{name}.svg', public / 'component-svgs/fritzing' / f'{name}.svg']
        exact = next((p for p in candidates if p.is_file()), None)
        if exact:
            # Preserve the entire SVG, including its embedded image resources.
            data, origin = exact.read_bytes(), str(exact.relative_to(source))
        else:
            item = next((m for m in metadata if m['id'] == name), None)
            thumbnail = (item or {}).get('thumbnail', '')
            # Metadata includes generated label placeholders; those are not art.
            if not thumbnail or 'fill="#e0e0e0"' in thumbnail:
                continue
            data, origin = thumbnail.encode(), f'frontend/public/components-metadata.json#{name}.thumbnail'
        (destination / f'{name}.svg').write_bytes(data)
        assets[name] = {'url': f'hardware/{name}.svg', 'source': origin, 'sha256': hashlib.sha256(data).hexdigest()}
    for name in ['arduino-uno', 'arduino-mega', 'esp32-s3']:
        file = public / 'boards' / f'{name}.svg'
        shutil.copyfile(file, destination / f'{name}.svg')
        assets[name] = {'url': f'hardware/{name}.svg', 'source': str(file.relative_to(source)), 'sha256': hashlib.sha256(file.read_bytes()).hexdigest()}
    (destination / 'manifest.json').write_text(json.dumps(assets, indent=2))
    license_dir = ROOT / 'public/licenses'
    license_dir.mkdir(exist_ok=True)
    shutil.copyfile(source / 'LICENSE', license_dir / 'velxio.txt')
    print(f'Exported {len(assets)} source hardware illustrations')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    export(parser.parse_args().source.resolve())
