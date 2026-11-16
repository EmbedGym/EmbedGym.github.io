// Uses the flat collection pattern from Astryx's table-filter scaffold.
import {useMemo, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Grid} from '@astryxdesign/core/Grid';
import {Text, Heading} from '@astryxdesign/core/Text';
import {Section} from '@astryxdesign/core/Section';
import {Table, proportional} from '@astryxdesign/core/Table';
import {type Baseline, type Catalog, type Run, modes, mean, pct, targetLabel, useData} from '../data';
import {Detail, Filter, Intro, LoadState} from '../components/ResearchUI';

export default function Leaderboard({catalog, runs}: {catalog: Catalog; runs: Run[]}) {
  const [target, setTarget] = useState('');
  const [protocol, setProtocol] = useState('');
  const [framework, setFramework] = useState('');
  const [level, setLevel] = useState('sim');
  const baselines = useData<Baseline[]>('baselines.json');
  const filtered = useMemo(() => runs.filter(r => (!target || r.target === target) && (!protocol || r.interface === protocol) && (!framework || catalog.targets.find(t => t.id === r.target)?.framework === framework)), [runs, target, protocol, framework, catalog]);
  const summaries = Object.entries(catalog.models).map(([id, model]) => {
    const data = filtered.filter(r => r.model === id);
    const selected = data.filter(r => r.mode === level);
    return {id, model, ...Object.fromEntries(modes.map(m => [m, pct(data.filter(r => r.mode === m))])),
      n: selected.length, rate: selected.length ? 100 * selected.filter(r => r.verdict === 'pass').length / selected.length : null,
      cost: mean(selected.map(r => r.cost)), steps: mean(selected.map(r => r.rounds)),
      inputTokens: mean(selected.map(r => r.tokens?.prompt_tokens)), outputTokens: mean(selected.map(r => r.tokens?.completion_tokens))};
  }).sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1));
  const selectedBaselines = baselines.data?.filter(row => (!target || row.target === target) && (!framework || catalog.targets.find(t => t.id === row.target)?.framework === framework)) ?? [];
  const baselineGroups = new Map<string, Baseline[]>();
  for (const row of selectedBaselines) {const id = `${row.method}/${row.setting}/${row.model}`; const list = baselineGroups.get(id) ?? []; list.push(row); baselineGroups.set(id, list);}
  const baselineRows = [...baselineGroups].map(([id, rows]) => ({id, method: rows[0].method, setting: rows[0].setting, model: rows[0].model,
    passed: rows.reduce((a, r) => a + r.passed, 0), total: rows.reduce((a, r) => a + r.total, 0), targets: rows.length}));
  return <VStack gap={6}>
    <Intro title="Leaderboard">8 models · 598 tasks · 3 feedback levels</Intro>
    <Grid columns={{minWidth: 220, max: 3}} gap={3}>
      <Filter label="Targets" value={target} onChange={setTarget} options={catalog.targets.map(t => ({value: t.id, label: targetLabel(catalog, t.id)}))} />
      <Filter label="Protocols" value={protocol} onChange={setProtocol} options={[...new Set(catalog.tasks.map(t => t.interface))].sort().map(value => ({value, label: value}))} />
      <Filter label="Frameworks" value={framework} onChange={setFramework} options={['Arduino', 'ESP-IDF', 'Zephyr'].map(value => ({value, label: value}))} />
    </Grid>
    <Text role="status">{filtered.length.toLocaleString()} runs</Text>
    <Table data={summaries} idKey="id" columns={[{key: 'model', header: 'Model', width: proportional(2)}, ...modes.map((mode, i) => ({key: mode, header: `L${i + 1}`}))]} />
    <Text type="supporting">L1 Compile · L2 Run · L3 Interact</Text>
    <Section padding={0} paddingBlock={4} dividers={['top']}><VStack gap={4}>
      <HStack gap={4} hAlign="between" wrap="wrap"><Heading level={2}>Cost vs. accuracy</Heading><Filter label="Level" value={level} onChange={setLevel} all={false} options={Object.entries(catalog.levels).map(([value, label]) => ({value, label}))} /></HStack>
      <CostPlot rows={summaries} />
      <Detail label="Steps, tokens & cost"><Table data={summaries} idKey="id" density="compact" columns={[
        {key: 'model', header: 'Model', width: proportional(2)}, {key: 'n', header: 'Runs'},
        {key: 'rate', header: 'Pass rate', renderCell: r => r.rate == null ? '—' : `${r.rate.toFixed(1)}%`},
        {key: 'cost', header: 'Mean USD / run', renderCell: r => r.cost == null ? '—' : `$${r.cost.toFixed(4)}`},
        {key: 'steps', header: 'Mean steps', renderCell: r => r.steps?.toFixed(1) ?? '—'},
        {key: 'inputTokens', header: 'Mean input tokens', renderCell: r => r.inputTokens?.toFixed(0) ?? '—'},
        {key: 'outputTokens', header: 'Mean output tokens', renderCell: r => r.outputTokens?.toFixed(0) ?? '—'},
      ]} /></Detail>
    </VStack></Section>
    <Section padding={0} paddingBlock={4} dividers={['top']}><VStack gap={4}>
      <Heading level={2}>Baselines</Heading>
      <Text type="supporting">4 Arduino targets · 3 models</Text>
      {!baselines.data ? <LoadState error={baselines.error} retry={baselines.retry} /> : !baselineRows.length ? <Text>No baseline measurements for the selected target/framework.</Text> : <Table data={baselineRows} idKey="id" density="compact" columns={[
        {key: 'method', header: 'Method'}, {key: 'setting', header: 'Setting'}, {key: 'model', header: 'Model'},
        {key: 'passed', header: 'Passed'}, {key: 'total', header: 'Evaluated'},
        {key: 'targets', header: 'Targets'}, {key: 'rate', header: 'Pass rate', renderCell: r => `${(100 * r.passed / r.total).toFixed(1)}%`},
      ]} />}
      <Detail label="Methodology"><Text>Task-weighted pass rates use the same tasks at each level. Protocol filters use the paper’s primary-interface categories.</Text><Text>Cost and token means use recorded values across passed and failed runs.</Text><Text>Baselines use paper/baseline/comparison.tsv. Target and framework filters apply; protocol filters do not.</Text></Detail>
    </VStack></Section>
  </VStack>;
}

function CostPlot({rows}: {rows: {id: string; model: string; rate: number | null; cost: number | null}[]}) {
  const points = rows.filter((r): r is typeof r & {rate: number; cost: number} => r.cost != null && r.rate != null && r.cost > 0);
  if (!points.length) return <Text>No cost measurements for this selection.</Text>;
  const min = Math.floor(Math.log10(Math.min(...points.map(p => p.cost))));
  const max = Math.max(min + 1, Math.ceil(Math.log10(Math.max(...points.map(p => p.cost)))));
  const x = (v: number) => 80 + 750 * (Math.log10(v) - min) / (max - min);
  const y = (v: number) => 310 - v * 2.5;
  return <svg viewBox="0 0 920 380" width="100%" role="img" aria-label="Scatter plot of mean cost per run versus pass rate. Cost uses a logarithmic axis. Exact values appear in the table below.">
    {[0, 25, 50, 75, 100].map(t => <g key={t}><path d={`M80 ${y(t)}H860`} stroke="var(--color-border)" /><text x="65" y={y(t) + 5} textAnchor="end" fill="var(--color-text-secondary)" fontSize="14">{t}%</text></g>)}
    {Array.from({length: max - min + 1}, (_, i) => min + i).map(t => <g key={t}><path d={`M${x(10 ** t)} 60V310`} stroke="var(--color-border)" /><text x={x(10 ** t)} y="335" textAnchor="middle" fill="var(--color-text-secondary)" fontSize="14">${(10 ** t).toFixed(Math.max(0, -t))}</text></g>)}
    {points.map((p, i) => <g key={p.id}><circle cx={x(p.cost)} cy={y(p.rate)} r="7" fill="var(--color-accent)" fillOpacity="0.75"><title>{p.model}: ${p.cost.toFixed(4)}, {p.rate.toFixed(1)}%</title></circle><text x={x(p.cost)} y={y(p.rate) - 14 - (i % 2) * 16} textAnchor="middle" fill="var(--color-text-primary)" fontSize="12">{p.model}</text></g>)}
    <text x="460" y="370" textAnchor="middle" fill="var(--color-text-secondary)" fontSize="15">Mean recorded USD per run · log scale</text>
  </svg>;
}
