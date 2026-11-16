#!/usr/bin/env python3
"""Create a static, reviewable snapshot from the read-only benchmark checkout.

Usage: python3 scripts/export-benchmark.py --source /path/to/velxio-automation
Only the export destination is written. Runtime/build never need the source repo.
"""
from __future__ import annotations

import argparse
import ast
import csv
import gzip
import hashlib
import json
import re
import shutil
import subprocess
import tempfile
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCHEMA = 1
EXTRAS = {'battery-9v', 'power-supply', 'level-shifter', 'wifi', 'ble'}


def hardware_command(command):
    # Match actual simulator invocations, not C++ Wire.read(), shell `read`,
    # or English words embedded in source-writing commands.
    return bool(re.search(r'(?:^|[;&|\n])\s*(?:(?:timeout|env)\s+\S+\s+)?(?:/[^\s;|]*/)?vlx-run(?:\s|$)', command))


def constants(path, names):
    """Read authoritative declarations without executing plotting/import code."""
    result = {}
    for node in ast.parse(path.read_text()).body:
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id in names:
                    result[target.id] = ast.literal_eval(node.value)
    assert set(result) == set(names), (path, names)
    return result


def read_json(path):
    return json.loads(path.read_text())


def text(path):
    return path.read_text(errors='replace') if path.is_file() else None


def sha(data):
    return hashlib.sha256(data).hexdigest()


def sanitize(value):
    """Retain experiment commands/results, excluding workstation paths and secrets.

    Raw model config, environment, system prompts, provider fields and host records
    are never exported. Patterns also cover accidental secrets printed by tools.
    """
    if isinstance(value, dict):
        return {k: sanitize(v) for k, v in value.items()}
    if isinstance(value, list):
        return [sanitize(v) for v in value]
    if not isinstance(value, str):
        return value
    value = re.sub(r'/Users/[^/\s]+', '/local-user', value)
    value = re.sub(r'-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?-----END [^-]*PRIVATE KEY-----', '[REDACTED PRIVATE KEY]', value)
    value = re.sub(r'\b(?:sk-(?:or-v1-)?[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b', '[REDACTED TOKEN]', value)
    value = re.sub(r'(?i)(authorization[\s"\x27:]+(?:bearer|basic)\s+)[A-Za-z0-9_./+=-]+', r'\1[REDACTED]', value)
    value = re.sub(r'(?i)(\b[A-Z_]*(?:API_KEY|ACCESS_TOKEN|SECRET_KEY)\s*[=:]\s*["\x27]?)[^\s"\x27,;]+', r'\1[REDACTED]', value)
    return value


def write_json(root, name, obj, compressed=False):
    raw = json.dumps(sanitize(obj), separators=(',', ':'), ensure_ascii=False, allow_nan=False).encode()
    data = gzip.compress(raw, compresslevel=6, mtime=0) if compressed else raw
    path = root / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    return {'path': name, 'sha256': sha(data), 'bytes': len(data)}


def write_run(root, run_id, detail):
    """Keep every output byte without requiring a browser to parse huge logs.

    Some real tool outputs exceed 180 MB. Chunk those outputs separately; the
    inspector loads one bounded slice and reports the complete length.
    """
    detail = sanitize(detail)
    assets = []
    for step in detail['steps']:
        for index, call in enumerate(step['calls']):
            output = call.get('output')
            if isinstance(output, str) and len(output) > 32768:
                call['outputParts'] = []
                call['outputLength'] = len(output)
                for offset in range(0, len(output), 65536):
                    name = f'outputs/{run_id}/{step["index"]}-{index}-{offset // 65536}.json.gz'
                    assets.append(write_json(root, name, output[offset:offset + 65536], compressed=True))
                    call['outputParts'].append(name)
                call['output'] = None
    assets.append(write_json(root, f'runs/{run_id}.json.gz', detail, compressed=True))
    return assets


def components(path, targets):
    entries, current, section, bullets = [], None, '', []

    def flush():
        if current is None:
            return
        for bullet in bullets:
            key, sep, val = bullet.partition(':')
            val = val.strip()
            if key == 'metadataId':
                current['id'] = val.strip('`')
            elif key in ('pins', 'unit test'):
                current['unitTest' if key == 'unit test' else key] = val
            elif key in ('implemented', 'verified'):
                current[key] = [t for t in targets if t in re.sub(r'\([^)]*\)', '', val)]
            else:
                current['usage'].append(bullet)
        if current.get('id') and current['id'] != '<id>':
            current['kind'] = 'support' if current['id'] in EXTRAS else 'peripheral'
            entries.append(current.copy())

    for line in path.read_text().splitlines():
        if line.startswith('## '):
            flush()
            current, bullets, section = None, [], line[3:]
        elif line.startswith('### '):
            flush()
            current = {'name': line[4:], 'section': section, 'usage': [], 'implemented': [], 'verified': []}
            bullets = []
        elif current is not None and line.startswith('- '):
            bullets.append(line[2:])
        elif current is not None and line[:1].isspace() and bullets:
            bullets[-1] += ' ' + line.strip()
    flush()
    return entries


def parse_steps(messages):
    steps, calls = [], {}
    for message in messages:
        if message.get('role') == 'assistant':
            step = {'index': len(steps) + 1, 'text': message.get('content') or '', 'calls': []}
            for call in message.get('tool_calls') or []:
                args = call.get('function', {}).get('arguments', '{}')
                try:
                    args = json.loads(args) if isinstance(args, str) else args
                except json.JSONDecodeError:
                    args = {'command': args}
                command = args.get('command', json.dumps(args))
                item = {'command': command, 'output': None, 'returncode': None,
                        'hardware': hardware_command(command)}
                calls[call['id']] = item
                step['calls'].append(item)
            steps.append(step)
        elif message.get('role') == 'tool':
            call = calls.get(message.get('tool_call_id'))
            if call is None:
                raise ValueError('Tool result does not match a preceding call')
            extra = message.get('extra') or {}
            call['output'] = extra.get('raw_output', message.get('content', ''))
            call['returncode'] = extra.get('returncode')
        elif message.get('extra', {}).get('interrupt_type') == 'FormatError' and steps:
            steps[-1]['formatError'] = message.get('content')
    return steps


def solution_files(root, target):
    if target.startswith('atmega'):
        candidates = ['solution.ino']
    elif target.endswith('_espidf'):
        candidates = ['main/main.c', 'main/CMakeLists.txt', 'sdkconfig.defaults']
    elif target.endswith('_zephyr'):
        candidates = ['app/src/main.c', 'app/app.overlay', 'app/prj.conf', 'app/CMakeLists.txt']
    else:
        candidates = ['code/code.ino', 'solution.ino']
    return {name: root.joinpath(name).read_text(errors='replace') for name in candidates if root.joinpath(name).is_file()}


def export(source, output):
    bench = source / 'cli/testbench'
    paper = constants(bench / 'paper/eval_leaderboard.py', ['MODELS', 'MODES', 'TARGETS'])
    categories = constants(bench / 'paper/task_categories/categories.py', ['APPLICATION', 'INTERFACE'])
    cfg = read_json(bench / 'harness/targets.json')
    targets = list(paper['TARGETS'])
    manifest = {'schema': SCHEMA, 'sourceCommit': subprocess.check_output(['git', '-C', str(source), 'rev-parse', 'HEAD'], text=True).strip(),
                'sourceDirty': bool(subprocess.check_output(['git', '-C', str(source), 'status', '--porcelain'], text=True).strip()),
                'cohortRule': 'Exact paper MODELS; intersection of graded task names across all three levels for each target and model.',
                'sourceFiles': {}, 'assets': []}
    for name in ['paper/eval_leaderboard.py', 'paper/task_categories/categories.py', 'components.md', 'targets.md', 'harness/targets.json', 'paper/baseline/comparison.tsv']:
        manifest['sourceFiles'][name] = sha((bench / name).read_bytes())
    # Export into a staging directory; invalid or interrupted exports never replace a good snapshot.
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='.benchmark-export-', dir=output.parent) as tmp:
        stage = Path(tmp)
        tasks = []
        circuit_paths = [str(p / t / 'circuit.ts') for p in sorted((bench / 'tasks').iterdir()) if (p / 'task.json').is_file() for t in targets if (p / t / 'circuit.ts').is_file()]
        with tempfile.TemporaryDirectory() as ctmp:
            inputs, converted = Path(ctmp) / 'input.json', Path(ctmp) / 'circuits.json'
            inputs.write_text(json.dumps(circuit_paths))
            subprocess.run(['node', '--disable-warning=ExperimentalWarning', str(ROOT / 'scripts/read-circuits.mjs'), str(inputs), str(converted)], check=True)
            circuits = read_json(converted)
        for p in sorted((bench / 'tasks').iterdir()):
            if not (p / 'task.json').is_file():
                continue
            spec = read_json(p / 'task.json')
            variants, parts = {}, set()
            for target in targets:
                key = str(p / target / 'circuit.ts')
                if key not in circuits:
                    continue
                circuit = circuits[key]
                effective_test = p / target / 'test.jsonl'
                override = effective_test.is_file()
                if not override:
                    effective_test = p / 'test.jsonl'
                tests = [json.loads(l) for l in effective_test.read_text().splitlines() if l.strip()]
                parts.update(row['part'] for row in tests if 'part' in row)
                overlays = {str(f.relative_to(p / target)): f.read_text() for f in (p / target).rglob('*.overlay') if 'build' not in f.parts}
                variant = {'circuit': circuit, 'pinout': spec.get('pinout', {}).get(target, {}), 'tests': tests,
                           'testOrigin': str(effective_test.relative_to(bench)), 'testSha256': sha(effective_test.read_bytes()),
                           'source': text(p / target / cfg[target]['firmware_source']), 'overlays': overlays,
                           'referenceHex': text(p / target / 'compiled.hex') if target.startswith('atmega') else None}
                variants[target] = variant
            classify = lambda table: next((c for c, members in table.items() if parts.intersection(members)), 'Unclassified')
            task = {'id': p.name, 'name': p.name.replace('_', ' ').title(), 'description': spec['description'],
                    'level': spec.get('level'), 'parts': sorted(parts), 'targets': list(variants),
                    'application': classify(categories['APPLICATION']), 'interface': classify(categories['INTERFACE']),
                    'protocols': [c for c, members in categories['INTERFACE'].items() if parts.intersection(members)]}
            assert task['application'] != 'Unclassified' and task['interface'] != 'Unclassified', p.name
            tasks.append(task)
            manifest['assets'].append(write_json(stage, f'tasks/{p.name}.json', {**task, 'variants': variants}))
        task_by_id = {t['id']: t for t in tasks}
        counts = {t: sum(t in task['targets'] for task in tasks) for t in targets}
        assert len(tasks) == 117 and sum(counts.values()) == 598, counts
        parts_catalog = components(bench / 'components.md', targets)
        assert sum(c['kind'] == 'peripheral' for c in parts_catalog) == 41
        target_facts = {}
        current = None
        for line in (bench / 'targets.md').read_text().splitlines():
            if line.startswith('## '):
                current = line[3:]
                target_facts[current] = {}
            elif current in targets and line.startswith('| ') and '---' not in line:
                cells = [s.strip() for s in line.strip('|').split('|')]
                if len(cells) == 2 and cells[0] != 'Field':
                    target_facts[current][cells[0]] = cells[1]
        catalog = {'schema': SCHEMA, 'models': paper['MODELS'], 'levels': {'nosim': 'L1 · Compile', 'sim_s': 'L2 · Run', 'sim': 'L3 · Interact'},
                   'targets': [{'id': t, 'mcu': paper['TARGETS'][t][0], 'framework': paper['TARGETS'][t][1],
                                'taskCount': counts[t], 'browserRunnable': t.startswith('atmega'), **cfg[t], 'facts': target_facts.get(t, {})} for t in targets],
                   'tasks': tasks, 'components': parts_catalog}
        manifest['assets'].append(write_json(stage, 'catalog.json', catalog))
        runs, exclusions = [], []
        for target in targets:
            for model in paper['MODELS']:
                grades = {}
                for mode in paper['MODES']:
                    result_dir = bench / 'results/bench' / target / mode / model / 'results'
                    grades[mode] = {f.name.removesuffix('.grade.json'): read_json(f) for f in sorted(result_dir.glob('*.grade.json'))}
                shared = set.intersection(*(set(g) for g in grades.values()))
                expected = {t['id'] for t in tasks if target in t['targets']}
                assert shared == expected, (target, model, shared ^ expected)
                for mode in paper['MODES']:
                    exclusions.extend(f'{target}/{mode}/{model}/{task}' for task in sorted(set(grades[mode]) - shared))
                    workspace = bench / 'results/bench' / target / mode / model
                    for task in sorted(shared):
                        run_id = f'{target}/{mode}/{model}/{task}'
                        grade = grades[mode][task]
                        assert grade['verdict'] in ('pass', 'fail', 'timeout', 'no_sketch'), (run_id, grade['verdict'])
                        stats = read_json(workspace / 'results' / f'{task}.stats.json')
                        trajectory_path = workspace / 'results' / f'{task}.traj.json'
                        trajectory = read_json(trajectory_path)
                        solution = workspace / 'tasks' / task / 'solution'
                        hex_file = solution / 'solution.hex'
                        summary = {'id': run_id, 'task': task, 'target': target, 'model': model, 'mode': mode,
                                   'verdict': grade['verdict'], 'passed': grade.get('passed'), 'failed': grade.get('failed'),
                                   'cost': stats.get('cost'), 'rounds': stats.get('rounds'), 'wallClockS': stats.get('wall_clock_s'),
                                   'tokens': stats.get('tokens'), 'hasFirmware': target.startswith('atmega') and hex_file.is_file(),
                                   'exitStatus': stats.get('exit_status'), 'application': task_by_id[task]['application'],
                                   'interface': task_by_id[task]['interface']}
                        runs.append(summary)
                        log = text(workspace / 'results' / f'{task}.log')
                        if log is None:
                            log = text(workspace / 'results' / f'{task}.grade.out')
                        detail = {**summary, 'gradeSummary': grade.get('summary'), 'failing': grade.get('failing', []),
                                  'gradeLog': log, 'files': solution_files(solution, target),
                                  'hex': text(hex_file) if summary['hasFirmware'] else None,
                                  'steps': parse_steps(trajectory.get('messages', [])),
                                  'provenance': {'testHash': stats.get('test_hash'), 'sourceCommit': stats.get('git_commit'),
                                                 'trajectorySha256': sha(trajectory_path.read_bytes()), 'runId': stats.get('run_id')}}
                        manifest['assets'].extend(write_run(stage, run_id, detail))
            print(f'Exported {target}: {sum(r["target"] == target for r in runs):,} runs', flush=True)
        assert len(runs) == 14352, len(runs)
        outcomes = {(r['target'], r['model'], r['task'], r['mode']): r['verdict'] for r in runs}
        for run in runs:
            key = (run['target'], run['model'], run['task'])
            run['recovered'] = outcomes[(*key, 'nosim')] != 'pass' and outcomes[(*key, 'sim')] == 'pass'
        manifest['assets'].append(write_json(stage, 'runs.json.gz', runs, compressed=True))
        with (bench / 'paper/baseline/comparison.tsv').open() as f:
            baselines = list(csv.DictReader(f, delimiter='\t'))
        for row in baselines:
            row['passed'], row['total'] = int(row['passed']), int(row['total'])
            row['cost_usd'] = float(row['cost_usd']) if row['cost_usd'] else None
        manifest['assets'].append(write_json(stage, 'baselines.json', baselines))
        manifest['counts'] = {'specifications': len(tasks), 'taskInstances': sum(counts.values()), 'peripherals': 41,
                              'runs': len(runs), 'byTarget': counts, 'byMode': dict(Counter(r['mode'] for r in runs))}
        manifest['excludedGrades'] = exclusions
        manifest['bytes'] = sum(a['bytes'] for a in manifest['assets'])
        manifest['missingFinalSources'] = sum(not solution_files(bench / 'results/bench' / r['target'] / r['mode'] / r['model'] / 'tasks' / r['task'] / 'solution', r['target']) for r in runs)
        write_json(stage, 'manifest.json', manifest)
        # Replacement is confined to the generated directory, after all cohort assertions pass.
        previous = output.with_name(output.name + '.previous')
        if previous.exists():
            raise RuntimeError(f'Recover or remove previous snapshot before exporting: {previous}')
        if output.exists():
            output.rename(previous)
        shutil.move(str(stage), str(output))
        if previous.exists():
            shutil.rmtree(previous)
        print(json.dumps({'counts': manifest['counts'], 'bytes': manifest['bytes'], 'excludedGrades': len(exclusions), 'missingFinalSources': manifest['missingFinalSources']}, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--output', type=Path, default=ROOT / 'public/data')
    args = parser.parse_args()
    export(args.source.resolve(), args.output.resolve())
