// Hardware catalog uses the search/filter/grid pattern of Astryx's library scaffold.
import {useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Grid} from '@astryxdesign/core/Grid';
import {Text, Heading} from '@astryxdesign/core/Text';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {Section} from '@astryxdesign/core/Section';
import {Table} from '@astryxdesign/core/Table';
import {type Catalog, targetLabel, useData} from '../data';
import {Detail, Empty, Filter, Intro, LoadState, SourceCode} from '../components/ResearchUI';
import {PartStrip} from '../components/HardwareArt';

export default function Hardware({catalog}: {catalog: Catalog}) {
  const [query, setQuery] = useState('');
  const [section, setSection] = useState('');
  const [kind, setKind] = useState('peripheral');
  const parts = catalog.components.filter(p => (!kind || p.kind === kind) && (!section || p.section === section) && `${p.id} ${p.name} ${p.usage.join(' ')}`.toLowerCase().includes(query.toLowerCase()));
  return <VStack gap={6}>
    <Intro title="Hardware">4 MCUs · 6 targets · 41 peripherals</Intro>
    <Grid columns={{minWidth: 300, max: 3}} gap={4}>{catalog.targets.map(target => {
      const avr = target.id.startsWith('atmega');
      const esp = target.id.startsWith('esp');
      const art = target.id.startsWith('atmega328') ? 'arduino-uno' : avr ? 'arduino-mega' : esp ? 'esp32-s3' : null;
      return <Card key={target.id} padding={4}><VStack gap={3}>
        {art && <img src={`${import.meta.env.BASE_URL}hardware/${art}.svg`} alt={`${target.mcu} development board`} style={{width: '100%', height: 'var(--embedgym-board-height)', objectFit: 'contain'}} />}
        <Heading level={2}>{target.mcu}</Heading><Text color="accent">{target.framework} · {target.taskCount} tasks</Text>
        <Text>{avr ? '8-bit AVR · avr8js' : esp ? '32-bit Xtensa LX7 · QEMU' : '32-bit Arm Cortex-M4F · Renode'}</Text>
        <Text type="supporting" color="secondary">{target.browserRunnable ? 'Browser runtime' : 'Server runtime'}</Text>
        <Detail label="Specifications"><Text>{target.facts.Time}</Text><SourceCode title="Compiler target" code={target.fqbn} /></Detail>
      </VStack></Card>;
    })}</Grid>
    <Section padding={0} paddingBlock={4} dividers={['top']}><VStack gap={4}>
      <Heading level={2}>Components</Heading>
      <TextInput label="Search components" value={query} onChange={setQuery} hasClear width="100%" />
      <HStack gap={4} wrap="wrap"><Filter label="Categories" value={section} onChange={setSection} options={[...new Set(catalog.components.map(p => p.section))].map(value => ({value, label: value}))} /><Filter label="Hardware kind" value={kind} onChange={setKind} options={[{value: 'peripheral', label: '41 peripheral models'}, {value: 'support', label: 'Power, adapters & wireless endpoints'}]} /><Text role="status">{parts.length} entries</Text></HStack>
      {!parts.length ? <Empty reset={() => {setQuery(''); setSection(''); setKind('');}} /> : <Grid columns={{minWidth: 280, max: 3}} gap={4}>{parts.map(part => <Card key={part.id} padding={4}><VStack gap={3}>
        <PartStrip parts={[part.id]} /><Heading level={3}>{part.name}</Heading><Text type="supporting" color="accent">{part.section}</Text>
        <Text type="supporting">{part.verified.length} / 6 targets verified</Text>
        <Button label="Open model →" href={`#/component/${part.id}`} />
      </VStack></Card>)}</Grid>}
    </VStack></Section>
  </VStack>;
}

type ModelFiles = {id: string; artifacts: {path: string; sha256: string; code: string; kind: string}[]};
export function ComponentPage({id, catalog}: {id: string; catalog: Catalog}) {
  const part = catalog.components.find(p => p.id === id);
  const source = useData<ModelFiles>(part ? `models/${id}.json` : null);
  if (!part) return <Intro title="Component not found" />;
  return <VStack gap={6}>
    <Button label="← Hardware library" href="#/hardware" variant="ghost" />
    <Intro eyebrow={part.section.toUpperCase()} title={part.name} />
    <PartStrip parts={[part.id]} />
    <Detail label="CLI controls & pins">{part.usage.map((line, i) => <SourceCode key={i} title={`Interface ${i + 1}`} code={line} />)}<Text>{part.pins}</Text></Detail>
    <Detail label="Target verification"><Table data={catalog.targets.map(t => ({id: t.id, target: targetLabel(catalog, t.id), verified: part.verified.includes(t.id) ? 'Verified' : 'Not recorded', implemented: part.implemented.includes(t.id) ? 'Recorded' : 'Not recorded'}))} idKey="id" columns={[{key: 'target', header: 'Target'}, {key: 'verified', header: 'Verification'}, {key: 'implemented', header: 'Selftest'}]} /><SourceCode title="Unit tests" code={part.unitTest ?? 'Not recorded'} /></Detail>
    <Section padding={0} paddingBlock={4} dividers={['top']}><VStack gap={4}>
      <Heading level={2}>Model & tests</Heading>
      {!source.data ? <LoadState error={source.error} retry={source.retry} /> : source.data.artifacts.length ? source.data.artifacts.map(file => <Detail key={file.path} label={`${file.kind === 'test' ? 'Test' : 'Model'} · ${file.path.split('/').pop()}`}><SourceCode title={file.path} code={file.code} language={file.path.endsWith('.py') ? 'python' : 'ts'} /></Detail>) : <Text>Source not linked.</Text>}
    </VStack></Section>
    <VStack gap={3}><Heading level={2}>Tasks</Heading>{catalog.tasks.filter(t => t.parts.includes(id)).map(t => <Button key={t.id} label={t.name} href={`#/task/${t.id}`} variant="ghost" />)}</VStack>
  </VStack>;
}
