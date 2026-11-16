import {useEffect, useMemo, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Grid} from '@astryxdesign/core/Grid';
import {Text, Heading} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {Section} from '@astryxdesign/core/Section';
import {TextInput} from '@astryxdesign/core/TextInput';
import {type RunDetail, useData} from '../data';
import {buildTrace, lineDiff, type TraceEvent} from '../trace';
import {CircuitScene} from './TaskAnimation';
import {Detail, Filter, LoadState, Pager, SourceCode} from './ResearchUI';

export function TracePlayer({detail}: {detail: RunDetail}) {
  const trace = useMemo(() => buildTrace(detail), [detail]);
  const [selected, setSelected] = useState(() => Math.max(0, trace.events.findIndex(e => e.kind === 'simulate')));
  const [playing, setPlaying] = useState(false);
  const [query, setQuery] = useState('');
  const [diff, setDiff] = useState(true);
  const [compact, setCompact] = useState(() => matchMedia('(max-width: 55rem)').matches);
  useEffect(() => {
    const media = matchMedia('(max-width: 55rem)');
    const update = () => setCompact(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const [timelinePage, setTimelinePage] = useState(() => Math.floor(selected / 10));
  const filtered = useMemo(() => trace.events.map((event, index) => ({event, index})).filter(({event}) => !query || `${event.label} ${event.thought} ${event.call?.command ?? ''} ${event.call?.output ?? ''}`.toLowerCase().includes(query.toLowerCase())), [trace, query]);
  const event = trace.events[selected];
  const version = trace.versions.find(v => v.n === event?.version);
  const previous = trace.versions.find(v => v.n === (event?.version ?? 0) - 1);
  const changes = useMemo(() => previous?.source != null && version?.source != null ? lineDiff(previous.source, version.source) : null, [previous, version]);
  const choose = (index: number) => {setSelected(index); setPlaying(false);};
  useEffect(() => {
    if (!playing) return;
    if (selected >= trace.events.length - 1) {setPlaying(false); return;}
    const timer = setTimeout(() => {setSelected(n => n + 1); setTimelinePage(Math.floor((selected + 1) / 10));}, 2200);
    return () => clearTimeout(timer);
  }, [playing, selected, trace.events.length]);
  if (!event) return <Text>No saved trajectory.</Text>;
  return <VStack gap={4}>
    <HStack gap={3} hAlign="between" wrap="wrap"><Heading level={2}>Agent trajectory</Heading><HStack gap={2} wrap="wrap"><Button label={playing ? 'Pause trajectory' : 'Play trajectory'} variant="primary" onClick={() => {setQuery(''); if (selected === trace.events.length - 1) setSelected(0); setPlaying(v => !v);}} /><Button label="Previous step" variant="ghost" isDisabled={!selected} onClick={() => {choose(selected - 1); setTimelinePage(Math.floor((selected - 1) / 10));}} /><Button label="Next step" variant="ghost" isDisabled={selected >= trace.events.length - 1} onClick={() => {choose(selected + 1); setTimelinePage(Math.floor((selected + 1) / 10));}} /></HStack></HStack>
    <Grid columns={{minWidth: 290, max: 3}} gap={5}>
      {compact ? <Filter label="Step" all={false} value={String(selected)} onChange={v => choose(Number(v))} options={trace.events.map((e, i) => ({value: String(i), label: `${i + 1}. ${e.label}${e.version ? ` · v${e.version}` : ''}`}))} /> :       <VStack gap={3}>
        <TextInput label="Find a step" value={query} onChange={q => {setQuery(q); setTimelinePage(0); setPlaying(false);}} hasClear />
        <VStack gap={1} role="navigation" aria-label="Trajectory timeline">
          {filtered.slice(timelinePage * 10, (timelinePage + 1) * 10).map(({event: item, index}) => <Button key={item.id} label={`${index + 1}. ${item.label}${item.version ? ` · v${item.version}` : ''}${item.step?.kind === 'compile' ? item.step.ok ? ' ✓' : ' ×' : ''}`} variant={selected === index ? 'secondary' : 'ghost'} aria-current={selected === index ? 'step' : undefined} onClick={() => choose(index)} style={{justifyContent: 'flex-start'}} />)}
          {!filtered.length && <Text>No matching steps.</Text>}
        </VStack>
        <Pager page={timelinePage} total={filtered.length} size={10} onChange={setTimelinePage} />
        <Button label="Open task" href={`#/task/${detail.task}?target=${detail.target}`} variant="ghost" />
      </VStack> }
      <VStack gap={3}>
        <Text type="label" color="accent" role="status">{event.label}{event.version ? ` · v${event.version}` : ''} · step {selected + 1} / {trace.events.length}</Text>
        <RecordedStage key={event.id} event={event} detail={detail} />
        {event.step?.kind === 'compile' && <Text style={{color: event.step.ok ? 'var(--embedgym-verified)' : 'var(--embedgym-signal)'}}>{event.step.ok ? 'Compiled' : 'Compile failed'}</Text>}
        {event.step?.kind === 'compile' && event.step.excerpt && <Detail label="Compiler output"><SourceCode title="Compiler output" code={event.step.excerpt} /></Detail>}
        {event.thought && <Detail label="Agent response"><Text style={{whiteSpace: 'pre-wrap'}}>{event.thought}</Text></Detail>}
        {event.call && <Detail label="Command & output"><VStack gap={3}><SourceCode title="Command" code={event.call.command} language="bash" /><Text type="supporting">Exit {event.call.returncode ?? 'unknown'}</Text>{event.call.outputParts ? <ChunkedOutput parts={event.call.outputParts} length={event.call.outputLength ?? 0} /> : <SourceCode title="Tool output" code={event.call.output ?? 'No saved output.'} />}</VStack></Detail>}
      </VStack>
      <VStack gap={3}>
        <HStack gap={2} hAlign="between" wrap="wrap"><Heading level={3}>{version ? `Code · v${version.n}` : 'Code'}</Heading>{changes !== null && <Button label={diff ? 'Show full code' : `Diff vs v${previous!.n}`} variant="ghost" onClick={() => setDiff(v => !v)} />}</HStack>
        {trace.versions.length > 1 && <Filter label="Code version" all={false} value={String(event.version ?? '')} onChange={v => {const index = trace.events.findIndex(e => e.kind === 'write' && e.version === Number(v)); if (index >= 0) {choose(index); setTimelinePage(Math.floor(index / 10));}}} options={trace.versions.map(v => ({value: String(v.n), label: `v${v.n}`}))} />}
        {version?.source != null ? <SourceCode title={diff && changes !== null ? `Changes in v${version.n}` : `Version ${version.n}`} code={diff && changes !== null ? changes : version.source} language={diff && changes !== null ? 'diff' : 'cpp'} /> : <Text color="secondary">{version ? 'This version was not recoverable from the trace.' : 'No code version recorded for this step.'}</Text>}
        <Detail label="Final submission">{Object.entries(detail.files).map(([file, source]) => <SourceCode key={file} title={file} code={source} language="cpp" />)}{!Object.keys(detail.files).length && <Text>No saved source.</Text>}</Detail>
      </VStack>
    </Grid>
    <Section padding={0} paddingBlock={4} dividers={['top']}><Detail label={`Final grading · ${detail.gradeSummary ?? detail.verdict}`}><SourceCode title="Grading log" code={detail.gradeLog ?? detail.failing.join('\n')} /></Detail></Section>
  </VStack>;
}

function RecordedStage({event, detail}: {event: TraceEvent; detail: RunDetail}) {
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const duration = event.step?.kind === 'simulate' ? Math.max(event.step.runMs, ...event.lines.map(l => l.t)) : 0;
  useEffect(() => {
    if (!playing || time >= duration) {setPlaying(false); return;}
    const timer = setTimeout(() => setTime(t => Math.min(duration, t + 100)), 100);
    return () => clearTimeout(timer);
  }, [playing, time, duration]);
  const lines = event.lines.filter(l => l.t <= time);
  const action = [...lines].reverse().find(l => l.kind === 'action');
  const component = /^(?:set|do|read) ([\w-]+)\./.exec(action?.text ?? '')?.[1] ?? null;
  const values: Record<string, Record<string, unknown>> = {};
  for (const line of lines) {
    if (line.kind !== 'action') continue;
    const field = /^read ([\w-]+)\.([\w]+) = /.exec(line.text);
    if (!field || line.value === undefined) continue;
    try {(values[field[1]] ??= {})[field[2]] = JSON.parse(line.value);} catch { /* preserve the raw observation below */ }
  }
  return <VStack gap={3}>
    <CircuitScene task={detail.task} target={detail.target} traceComponent={component} traceValues={values} paused />
    <Text type="supporting" color="secondary">Recorded trace</Text>
    {duration > 0 ? <>
      <HStack gap={2} hAlign="between"><Button label={playing ? 'Pause test' : 'Replay test'} variant="primary" onClick={() => {if (time >= duration) setTime(0); setPlaying(v => !v);}} /><Text hasTabularNumbers>{time} / {duration} ms</Text></HStack>
      <input aria-label="Recorded test time" type="range" min={0} max={duration} step={1} value={time} onChange={e => {setPlaying(false); setTime(Number(e.target.value));}} style={{width: '100%', accentColor: 'var(--color-accent)'}} />
      <SourceCode title="Serial & observations" code={lines.filter(l => l.kind !== 'end').slice(-8).map(l => `[${l.t} ms] ${l.text}`).join('\n') || 'Waiting for recorded output…'} />
      {event.step?.kind === 'simulate' && event.step.errors.length > 0 && <Text style={{color: 'var(--embedgym-signal)'}}>{event.step.errors.join('\n')}</Text>}
      {event.step?.kind === 'simulate' && event.step.actions && <Detail label="Action script"><SourceCode title="Action script" code={event.step.actions} /></Detail>}
    </> : null}
  </VStack>;
}

function ChunkedOutput({parts, length}: {parts: string[]; length: number}) {
  const [page, setPage] = useState(0);
  const result = useData<string>(parts[page]);
  return <VStack gap={3}><Text type="supporting">{length.toLocaleString()} characters</Text>{result.data == null ? <LoadState error={result.error} retry={result.retry} /> : <SourceCode title={`Output · ${page + 1} / ${parts.length}`} code={result.data} />}<Pager page={page} total={parts.length} size={1} onChange={setPage} /></VStack>;
}
