import {lazy, Suspense, useEffect, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Grid} from '@astryxdesign/core/Grid';
import {Text, Heading} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {Section} from '@astryxdesign/core/Section';
import {type Catalog, type Run, modes, pct, useData} from './data';
import {Intro, LoadState} from './components/ResearchUI';
import {TaskAnimation} from './components/TaskAnimation';

const Benchmark = lazy(() => import('./pages/Benchmark'));
const TaskPage = lazy(() => import('./pages/Benchmark').then(m => ({default: m.TaskPage})));
const Runs = lazy(() => import('./pages/Runs'));
const RunPage = lazy(() => import('./pages/Runs').then(m => ({default: m.RunPage})));
const Hardware = lazy(() => import('./pages/Hardware'));
const ComponentPage = lazy(() => import('./pages/Hardware').then(m => ({default: m.ComponentPage})));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));

export default function App() {
  const [hash, setHash] = useState(location.hash || '#/');
  useEffect(() => {const update = () => {setHash(location.hash || '#/'); window.scrollTo({top: 0});}; window.addEventListener('hashchange', update); return () => window.removeEventListener('hashchange', update);}, []);
  const catalog = useData<Catalog>('catalog.json');
  const records = useData<Run[]>('runs.json.gz');
  const [path, search = ''] = hash.replace(/^#/, '').split('?');
  const params = new URLSearchParams(search);
  const nav = [['/', 'Overview'], ['/hardware', 'Hardware library'], ['/benchmark', 'Benchmark'], ['/runs', 'Agent runs'], ['/leaderboard', 'Leaderboard']];
  useEffect(() => {document.title = `EmbedGym · ${nav.find(([url]) => url === path)?.[1] ?? 'Research explorer'}`;}, [path]);
  let page;
  if (!catalog.data || !records.data) page = <LoadState error={catalog.error ?? records.error} retry={() => {catalog.retry(); records.retry();}} />;
  else {
    const shared = {catalog: catalog.data, runs: records.data};
    if (path === '/benchmark') page = <Benchmark {...shared} />;
    else if (path.startsWith('/task/')) page = <TaskPage key={hash} id={decodeURIComponent(path.slice(6))} initialTarget={params.get('target') ?? undefined} {...shared} />;
    else if (path === '/runs') page = <Runs key={hash} params={params} {...shared} />;
    else if (path.startsWith('/run/')) page = <RunPage key={path} id={decodeURIComponent(path.slice(5))} catalog={catalog.data} />;
    else if (path === '/hardware') page = <Hardware catalog={catalog.data} />;
    else if (path.startsWith('/component/')) page = <ComponentPage key={path} id={decodeURIComponent(path.slice(11))} catalog={catalog.data} />;
    else if (path === '/leaderboard') page = <Leaderboard {...shared} />;
    else if (path === '/') page = <Overview {...shared} />;
    else page = <Intro title="Page not found" />;
  }
  return <VStack gap={10} padding={6} width="100%" maxWidth="var(--embedgym-content-width)" style={{marginInline: 'auto'}}>
    <Section padding={0} paddingBlock={4} dividers={['bottom']}>
      <HStack gap={4} wrap="wrap" hAlign="between" vAlign="center">
        <Button label="EmbedGym" href="#/" variant="ghost" />
        <HStack gap={1} wrap="wrap" role="navigation" aria-label="Main navigation">{nav.map(([url, label]) => <Button key={url} label={label} href={`#${url}`} variant={path === url ? 'secondary' : 'ghost'} aria-current={path === url ? 'page' : undefined} />)}</HStack>
      </HStack>
    </Section>
    <Suspense fallback={<LoadState />}>{page}</Suspense>
    <Section padding={0} paddingBlock={4} dividers={['top']}><HStack gap={4} wrap="wrap" hAlign="between"><Text weight="bold">EmbedGym</Text><HStack gap={3}><Button label="Data" href={`${import.meta.env.BASE_URL}data/manifest.json`} variant="ghost" /><Button label="License" href={`${import.meta.env.BASE_URL}licenses/velxio.txt`} variant="ghost" /></HStack></HStack></Section>
  </VStack>;
}

function Overview({catalog, runs}: {catalog: Catalog; runs: Run[]}) {
  const featured = ['ltr390', 'haptic', 'mqtt', 'ble'].map(term => catalog.tasks.find(t => t.id.includes(term))).filter(t => t != null);
  return <VStack gap={10}>
    <VStack gap={6}>
      <Heading level={1} type="display-1">EmbedGym</Heading>
      <Text type="large" color="secondary">Virtual hardware for embedded coding agents.</Text>
      <HStack gap={3} wrap="wrap"><Button label="Tasks →" variant="primary" href="#/benchmark" /><Button label="Agent runs" href="#/runs" /></HStack>
      <Section padding={0} paddingBlock={6} dividers={['top', 'bottom']}><Grid columns={{minWidth: 140, max: 5}} gap={6}>{[
        ['4', 'MCUs · 3 architectures'], ['6', 'MCU–framework targets'], ['41', 'peripheral models'], ['598', 'task instances'], ['14,352', 'agent trajectories'],
      ].map(([value, label]) => <VStack gap={1} key={label}><Text type="display-2" color="accent" hasTabularNumbers>{value}</Text><Text type="supporting">{label}</Text></VStack>)}</Grid></Section>
    </VStack>
    <VStack gap={6}>
      <HStack hAlign="between" gap={4} wrap="wrap"><Heading level={2}>Featured tasks</Heading><Button label="All tasks →" href="#/benchmark" variant="ghost" /></HStack>
      <Grid columns={{minWidth: 260, max: 2}} gap={6}>{featured.map(task => <Section key={task.id} padding={0} paddingBlock={4} dividers={['top']}><VStack gap={4}><TaskAnimation task={task.id} target={task.targets[0]} compact /><Heading level={3}>{task.name}</Heading><Button label="Open task →" href={`#/task/${task.id}`} variant="ghost" /></VStack></Section>)}</Grid>
    </VStack>
    <Section padding={0} paddingBlock={6} dividers={['top', 'bottom']}><VStack gap={6}><Heading level={2}>Pass rates</Heading><Grid columns={{minWidth: 200, max: 3}} gap={6}>{modes.map(mode => <VStack key={mode} gap={2}><Text type="label">{catalog.levels[mode]}</Text><Text type="display-2" style={{color: mode === 'sim' ? 'var(--embedgym-verified)' : 'var(--color-accent)'}}>{pct(runs.filter(r => r.mode === mode))}</Text></VStack>)}</Grid><Button label="Leaderboard →" href="#/leaderboard" /></VStack></Section>
  </VStack>;
}
