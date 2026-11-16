// Adapted from Astryx's table-filter template: filter header, flat table,
// paged records and an inspector. Shared shell owns the horizontal frame.
import {useMemo, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Grid} from '@astryxdesign/core/Grid';
import {Text} from '@astryxdesign/core/Text';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Button} from '@astryxdesign/core/Button';
import {Table, proportional} from '@astryxdesign/core/Table';
import {type Catalog, type Run, type RunDetail, targetLabel, taskLabel, useData} from '../data';
import {Detail, Empty, Filter, Intro, LoadState, Pager, SourceCode} from '../components/ResearchUI';
import {TracePlayer} from '../components/TracePlayer';

export default function Runs({catalog, runs, params}: {catalog: Catalog; runs: Run[]; params: URLSearchParams}) {
  const [query, setQuery] = useState(params.get('task') ?? '');
  const [target, setTarget] = useState(params.get('target') ?? '');
  const [model, setModel] = useState('');
  const [mode, setMode] = useState('');
  const [outcome, setOutcome] = useState('');
  const [sort, setSort] = useState('task');
  const [page, setPage] = useState(0);
  const change = (setter: (v: string) => void) => (value: string) => {setter(value); setPage(0);};
  const reset = () => {setQuery(''); setTarget(''); setModel(''); setMode(''); setOutcome(''); setPage(0);};
  const filtered = useMemo(() => runs.filter(r =>
    `${r.task} ${taskLabel(catalog, r.task)}`.toLowerCase().includes(query.toLowerCase().trim()) &&
    (!target || r.target === target) && (!model || r.model === model) && (!mode || r.mode === mode) &&
    (!outcome || (outcome === 'recovered' ? r.recovered : r.verdict === outcome)))
    .sort((a, b) => sort === 'cost' ? (b.cost ?? -1) - (a.cost ?? -1) : sort === 'steps' ? (b.rounds ?? -1) - (a.rounds ?? -1) : a.task.localeCompare(b.task) || a.id.localeCompare(b.id)), [runs, catalog, query, target, model, mode, outcome, sort]);
  const tableRows = filtered.slice(page * 25, (page + 1) * 25).map(r => ({...r, name: taskLabel(catalog, r.task)}));
  return <VStack gap={6}>
    <Intro title="Agent runs">14,352 recorded experiments</Intro>
    <VStack gap={4}>
      <TextInput label="Search task" type="search" value={query} onChange={change(setQuery)} hasClear width="100%" />
      <Grid columns={{minWidth: 180, max: 4}} gap={3}>
        <Filter label="Models" value={model} onChange={change(setModel)} options={Object.entries(catalog.models).map(([value, label]) => ({value, label}))} />
        <Filter label="Targets" value={target} onChange={change(setTarget)} options={catalog.targets.map(t => ({value: t.id, label: targetLabel(catalog, t.id)}))} />
        <Filter label="Levels" value={mode} onChange={change(setMode)} options={Object.entries(catalog.levels).map(([value, label]) => ({value, label}))} />
        <Filter label="Outcomes" value={outcome} onChange={change(setOutcome)} options={[{value: 'pass', label: 'Passed'}, {value: 'fail', label: 'Failed'}, {value: 'timeout', label: 'Timed out'}, {value: 'no_sketch', label: 'No submission'}, {value: 'recovered', label: 'L1 failed → L3 passed'}]} />
      </Grid>
      <HStack gap={4} hAlign="between" wrap="wrap"><Text role="status">{filtered.length.toLocaleString()} matching runs</Text><Filter label="Sort" all={false} value={sort} onChange={change(setSort)} options={[{value: 'task', label: 'Task name'}, {value: 'cost', label: 'Highest cost'}, {value: 'steps', label: 'Most steps'}]} /><Button label="Clear filters" variant="ghost" onClick={reset} /></HStack>
    </VStack>
    {!filtered.length ? <Empty reset={reset} /> : <Table data={tableRows} idKey="id" density="compact" hasHover columns={[
      {key: 'name', header: 'Task / record', width: proportional(2), renderCell: r => <Button label={r.name} variant="ghost" href={`#/run/${r.id}`} />},
      {key: 'model', header: 'Model', renderCell: r => catalog.models[r.model]},
      {key: 'target', header: 'Target', renderCell: r => targetLabel(catalog, r.target)},
      {key: 'mode', header: 'Level', renderCell: r => catalog.levels[r.mode]},
      {key: 'verdict', header: 'Outcome', renderCell: r => <Text style={{color: r.verdict === 'pass' ? 'var(--embedgym-verified)' : 'var(--embedgym-signal)'}}>{r.verdict}</Text>},
      {key: 'cost', header: 'Cost', renderCell: r => r.cost == null ? '—' : `$${r.cost.toFixed(4)}`},
      {key: 'rounds', header: 'Steps'},
    ]} />}
    <Pager page={page} total={filtered.length} size={25} onChange={setPage} />
  </VStack>;
}

export function RunPage({id, catalog}: {id: string; catalog: Catalog}) {
  const result = useData<RunDetail>(`runs/${id}.json.gz`);
  const detail = result.data;
  if (!detail) return <LoadState error={result.error} retry={result.retry} />;
  return <VStack gap={6}>
    <Button label="← Agent runs" href={`#/runs?task=${detail.task}&target=${detail.target}`} variant="ghost" />
    <Intro eyebrow="RECORDED REPLAY" title={taskLabel(catalog, detail.task)}>{catalog.models[detail.model]} · {targetLabel(catalog, detail.target)} · {catalog.levels[detail.mode]}</Intro>
    <HStack gap={6} wrap="wrap"><Text weight="bold" style={{color: detail.verdict === 'pass' ? 'var(--embedgym-verified)' : 'var(--embedgym-signal)'}}>{detail.gradeSummary ?? detail.verdict}</Text><Text>{detail.rounds ?? '—'} steps</Text><Text>{detail.cost == null ? 'Cost unavailable' : `$${detail.cost.toFixed(4)}`}</Text><Text>{detail.wallClockS?.toFixed(1) ?? '—'} seconds</Text></HStack>
    <TracePlayer detail={detail} />
    <Detail label="Provenance"><SourceCode title="Record IDs" code={JSON.stringify(detail.provenance, null, 2)} language="json" /></Detail>
  </VStack>;
}
