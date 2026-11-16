#!/usr/bin/env python3
"""Verify the complete shipped archive, optionally against read-only source grades."""
import argparse
import gzip
import hashlib
import importlib.util
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'public/data'

def read(path):
    raw = path.read_bytes()
    return json.loads(gzip.decompress(raw) if path.suffix == '.gz' else raw)

def verify(source=None):
    manifest, catalog, runs = (read(DATA / name) for name in ['manifest.json', 'catalog.json', 'runs.json.gz'])
    models = set(catalog['models'])
    tasks = {t['id']: t for t in catalog['tasks']}
    assert len(models) == 8 and len(tasks) == 117 and len(runs) == 14352
    assert len({r['id'] for r in runs}) == len(runs)
    assert Counter(r['mode'] for r in runs) == {'nosim': 4784, 'sim_s': 4784, 'sim': 4784}
    assert sum(p['kind'] == 'peripheral' for p in catalog['components']) == 41
    assert sum(t['taskCount'] for t in catalog['targets']) == 598
    ids = {r['id']: r for r in runs}
    for target in catalog['targets']:
        expected = {t['id'] for t in tasks.values() if target['id'] in t['targets']}
        assert len(expected) == target['taskCount']
        for model in models:
            for mode in catalog['levels']:
                actual = {r['task'] for r in runs if r['target'] == target['id'] and r['model'] == model and r['mode'] == mode}
                assert actual == expected, (target['id'], model, mode)
    for name, task in tasks.items():
        detail = read(DATA / f'tasks/{name}.json')
        assert set(detail['variants']) == set(task['targets'])
        for target, variant in detail['variants'].items():
            known = {p['id'] for p in variant['circuit']['boards'] + variant['circuit']['components']}
            for wire in variant['circuit']['wires']:
                assert wire['start']['componentId'] in known and wire['end']['componentId'] in known
            assert variant['tests'] and variant['testOrigin'] and variant['source']
    assets = {a['path']: a for a in manifest['assets']}
    assert len(assets) == len(manifest['assets'])
    actual_files = {str(p.relative_to(DATA)) for p in DATA.rglob('*') if p.is_file() and p.name != 'manifest.json'}
    assert set(assets) == actual_files, (len(assets), len(actual_files), actual_files - set(assets))
    for name, asset in assets.items():
        raw = (DATA / name).read_bytes()
        assert len(raw) == asset['bytes'] and hashlib.sha256(raw).hexdigest() == asset['sha256'], name
    sources_missing, chunked_calls = 0, 0
    for summary in runs:
        detail = read(DATA / f'runs/{summary["id"]}.json.gz')
        for key in ['id', 'task', 'target', 'model', 'mode', 'verdict', 'cost', 'rounds', 'tokens', 'hasFirmware']:
            assert detail[key] == summary[key], (summary['id'], key)
        assert bool(detail['hex']) == summary['hasFirmware']
        sources_missing += not detail['files']
        pair = lambda mode: ids[f'{summary["target"]}/{mode}/{summary["model"]}/{summary["task"]}']
        assert summary['recovered'] == (pair('nosim')['verdict'] != 'pass' and pair('sim')['verdict'] == 'pass')
        for step in detail['steps']:
            for call in step['calls']:
                if call.get('outputParts'):
                    assert call['output'] is None
                    parts = call['outputParts']
                    assert all(p in assets for p in parts)
                    lengths = [len(read(DATA / p)) for p in parts]
                    assert sum(lengths) == call['outputLength'] and max(lengths) <= 65536
                    chunked_calls += 1
                else:
                    assert len(call.get('output') or '') <= 32768
        if source:
            grade = read(source / 'cli/testbench/results/bench' / summary['target'] / summary['mode'] / summary['model'] / 'results' / f'{summary["task"]}.grade.json')
            assert grade['verdict'] == summary['verdict']
            assert grade.get('summary') == detail['gradeSummary']
    assert sources_missing == manifest['missingFinalSources']
    assert sum(a['bytes'] for a in assets.values()) == manifest['bytes'] < 950_000_000
    assert max(a['bytes'] for a in assets.values()) < 100_000_000
    print(f'PASS: {len(tasks)} specifications, 598 variants, {len(runs):,} source-matched runs, {len(assets):,} hashed assets; {chunked_calls:,} losslessly chunked outputs; {sources_missing} explicitly missing final-source records.')
    print('Pass counts:', dict(Counter(r['mode'] for r in runs if r['verdict'] == 'pass')))

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path)
    verify(parser.parse_args().source)
