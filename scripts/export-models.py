#!/usr/bin/env python3
"""Copy exact peripheral model and unit-test sources for the research inspector."""
import argparse
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
normalize = lambda name: re.sub('[^a-z0-9]', '', name.lower())
ALIASES = {'joystick': ['ky023joystick'], 'ky-008': ['ky008laser'], 'line-sensor': ['linesensormodel'],
           'ky-040': ['ky040'], 'ky-020-tilt-switch': ['ky020tiltswitch']}

def export(source):
    candidates = [*source.joinpath('backend/app/services/local').rglob('*.py'),
                  *source.joinpath('frontend/src/simulation/parts').rglob('*.ts')]
    components = json.loads((ROOT / 'public/data/catalog.json').read_text())['components']
    output = ROOT / 'public/data/models'
    output.mkdir(exist_ok=True)
    asset_records = []
    for component in components:
        names = {normalize(component['id']), *ALIASES.get(component['id'], [])}
        files = [p for p in candidates if normalize(p.stem) in names and not p.name.endswith('.test.ts')]
        tests = [p for p in source.joinpath('backend/tests/local').rglob('test_*.py') if normalize(p.stem.removeprefix('test_')) in names]
        artifacts = []
        for path in files + tests:
            artifacts.append({'path': str(path.relative_to(source)), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'code': path.read_text(), 'kind': 'test' if path in tests else 'model'})
        data = json.dumps({'id': component['id'], 'artifacts': artifacts}, separators=(',', ':')).encode()
        (output / f'{component["id"]}.json').write_bytes(data)
        asset_records.append({'path': f'models/{component["id"]}.json', 'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data)})
    manifest_path = ROOT / 'public/data/manifest.json'
    manifest = json.loads(manifest_path.read_text())
    manifest['assets'] = [a for a in manifest['assets'] if not a['path'].startswith('models/')] + asset_records
    manifest['bytes'] = sum(a['bytes'] for a in manifest['assets'])
    manifest_path.write_text(json.dumps(manifest, separators=(',', ':')))
    print(f'Exported model-source records for {len(components)} hardware entries')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    export(parser.parse_args().source.resolve())
