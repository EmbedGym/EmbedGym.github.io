"""One-time migration of an existing snapshot to bounded output chunks."""
import gzip
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('exporter', ROOT / 'scripts/export-benchmark.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
root = ROOT / 'public/data'
manifest = json.loads((root / 'manifest.json').read_text())
assets, changed = [], 0
for asset in manifest['assets']:
    if asset['path'].startswith('runs/'):
        detail = json.loads(gzip.decompress((root / asset['path']).read_bytes()))
        reclassified = False
        for step in detail['steps']:
            for call in step['calls']:
                hardware = module.hardware_command(call['command'])
                if hardware != call['hardware']:
                    call['hardware'] = hardware
                    reclassified = True
        if reclassified or any(len(c.get('output') or '') > 32768 for s in detail['steps'] for c in s['calls']):
            assets.extend(module.write_run(root, detail['id'], detail))
            changed += 1
            continue
    assets.append(asset)
manifest['assets'] = assets
manifest['bytes'] = sum(a['bytes'] for a in assets)
module.write_json(root, 'manifest.json', manifest)
print(f'Chunked long output in {changed} runs; {len(assets)} total artifacts, {manifest["bytes"]:,} bytes')
