// Adapted from Astryx's library template: search/filter header, gap-6 content,
// responsive catalog grid and explicit empty state. Shared shell owns gutters.
import {useMemo, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Grid} from '@astryxdesign/core/Grid';
import {Text, Heading} from '@astryxdesign/core/Text';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Card} from '@astryxdesign/core/Card';
import {Button} from '@astryxdesign/core/Button';
import {Section} from '@astryxdesign/core/Section';
import {Table} from '@astryxdesign/core/Table';
import {type Catalog, type Run, type TaskDetail, modes, pct, targetLabel, useData} from '../data';
import {Detail, Empty, Filter, Intro, LoadState, Pager, PillLine, SourceCode} from '../components/ResearchUI';
import {TaskAnimation} from '../components/TaskAnimation';

export default function Benchmark({catalog, runs}: {catalog: Catalog; runs: Run[]}) {
  const [query, setQuery] = useState('');
  const [target, setTarget] = useState('');
  const [part, setPart] = useState('');
  const [protocol, setProtocol] = useState('');
  const [application, setApplication] = useState('');
  const [page, setPage] = useState(0);
  const reset = () => {setQuery(''); setTarget(''); setPart(''); setProtocol(''); setApplication(''); setPage(0);};
  const change = (setter: (value: string) => void) => (value: string) => {setter(value); setPage(0);};
  const filtered = useMemo(() => catalog.tasks.filter(t =>
    `${t.name} ${t.description} ${t.parts.join(' ')}`.toLowerCase().includes(query.toLowerCase().trim()) &&
    (!target || t.targets.includes(target)) && (!part || t.parts.includes(part)) &&
    (!protocol || t.protocols.includes(protocol)) && (!application || t.application === application)), [catalog, query, target, part, protocol, application]);
  const groupedRuns = useMemo(() => {
    const result = new Map<string, Run[]>();
    for (const run of runs) if (!target || run.target === target) {
      const group = result.get(run.task) ?? []; group.push(run); result.set(run.task, group);
    }
    return result;
  }, [runs, target]);
  return <VStack gap={6}>
    <Intro title="Tasks">117 specifications · 598 target instances</Intro>
    <VStack gap={4}>
      <TextInput label="Search tasks" type="search" value={query} onChange={change(setQuery)} hasClear width="100%" />
      <Grid columns={{minWidth: 200, max: 4}} gap={3}>
        <Filter label="Targets" value={target} onChange={change(setTarget)} options={catalog.targets.map(t => ({value: t.id, label: targetLabel(catalog, t.id)}))} />
        <Filter label="Components" value={part} onChange={change(setPart)} options={catalog.components.map(p => ({value: p.id, label: p.name}))} />
        <Filter label="Protocols" value={protocol} onChange={change(setProtocol)} options={[...new Set(catalog.tasks.flatMap(t => t.protocols))].sort().map(value => ({value, label: value}))} />
        <Filter label="Applications" value={application} onChange={change(setApplication)} options={[...new Set(catalog.tasks.map(t => t.application))].sort().map(value => ({value, label: value}))} />
      </Grid>
      <HStack hAlign="between" wrap="wrap" gap={3}><Text role="status">{filtered.length} specifications · {filtered.reduce((n, t) => n + (target ? 1 : t.targets.length), 0)} target instances</Text><Button label="Clear filters" variant="ghost" onClick={reset} /></HStack>
    </VStack>
    {!filtered.length ? <Empty reset={reset} /> : <Grid columns={{minWidth: 280, max: 3}} gap={4}>
      {filtered.slice(page * 12, (page + 1) * 12).map(task => <Card key={task.id} padding={4}><VStack gap={4}>
        <TaskAnimation task={task.id} target={target || task.targets[0]} compact />
        <VStack gap={2}><Text type="label" color="accent">{task.application}</Text><Heading level={2}>{task.name}</Heading></VStack>
        <PillLine items={task.protocols} />
        <Text type="supporting">{task.targets.length} targets</Text>
        <HStack gap={4} wrap="wrap">{modes.map((mode, i) => <Text key={mode} type="supporting">L{i + 1} {pct((groupedRuns.get(task.id) ?? []).filter(r => r.mode === mode))}</Text>)}</HStack>
        <Button label="Open task →" href={`#/task/${task.id}${target ? `?target=${target}` : ''}`} />
      </VStack></Card>)}
    </Grid>}
    <Pager page={page} total={filtered.length} size={12} onChange={setPage} />
  </VStack>;
}

export function TaskPage({id, initialTarget, catalog, runs}: {id: string; initialTarget?: string; catalog: Catalog; runs: Run[]}) {
  const result = useData<TaskDetail>(`tasks/${encodeURIComponent(id)}.json`);
  const [selectedTarget, setTarget] = useState(initialTarget ?? '');
  if (!result.data) return <LoadState error={result.error} retry={result.retry} />;
  const task = result.data;
  const target = task.targets.includes(selectedTarget) ? selectedTarget : task.targets[0];
  const variant = task.variants[target];
  const records = runs.filter(r => r.task === id && r.target === target);
  return <VStack gap={6}>
    <Button label="← All tasks" href="#/benchmark" variant="ghost" />
    <Intro eyebrow={task.application.toUpperCase()} title={task.name} />
    <Detail label="Task brief"><Text>{task.description}</Text></Detail>
    <TaskAnimation key={target} task={task.id} target={target} />
    <HStack gap={4} wrap="wrap"><Filter label="Target" value={target} onChange={setTarget} all={false} options={task.targets.map(t => ({value: t, label: targetLabel(catalog, t)}))} /><Button label="Explore agent runs" href={`#/runs?task=${id}&target=${target}`} /></HStack>
    <Section padding={0} paddingBlock={4} dividers={['top']}><VStack gap={4}>
      <Heading level={2}>Connections</Heading>
      <Table data={variant.circuit.wires.map(w => ({id: w.id, from: `${w.start.componentId}.${w.start.pinName}`, to: `${w.end.componentId}.${w.end.pinName}`}))} idKey="id" columns={[{key: 'from', header: 'From'}, {key: 'to', header: 'To'}]} density="compact" />
      {Object.entries(variant.overlays).map(([file, code]) => <Detail key={file} label={file}><SourceCode title={file} code={code} language="c" /></Detail>)}
    </VStack></Section>
    <Section padding={0} paddingBlock={4} dividers={['top']}><VStack gap={4}><Heading level={2}>Results</Heading>
      <Table data={Object.entries(catalog.models).map(([model, name]) => ({id: model, name, ...Object.fromEntries(modes.map(mode => [mode, pct(records.filter(r => r.model === model && r.mode === mode))]))}))} idKey="id" columns={[{key: 'name', header: 'Model'}, ...modes.map((mode, i) => ({key: mode, header: `L${i + 1}`}))]} />
      <Text type="supporting">L1 Compile · L2 Run · L3 Interact</Text>
    </VStack></Section>
    <Detail label={`Test vectors (${variant.tests.length})`}><SourceCode title="test.jsonl" code={variant.tests.map(t => JSON.stringify(t)).join('\n')} language="json" /></Detail>
    {variant.source && <Detail label="Reference firmware"><SourceCode title="Reference firmware" code={variant.source} language="cpp" /></Detail>}
    <Button label="Download data" href={`${import.meta.env.BASE_URL}data/tasks/${id}.json`} />
  </VStack>;
}
