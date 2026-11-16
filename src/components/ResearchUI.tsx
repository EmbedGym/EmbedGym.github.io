import type {ReactNode} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Text, Heading} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {Selector} from '@astryxdesign/core/Selector';
import {Section} from '@astryxdesign/core/Section';
import {CodeBlock} from '@astryxdesign/core/CodeBlock';

export function Intro({eyebrow, title, children}: {eyebrow?: string; title: string; children?: ReactNode}) {
  return <VStack gap={3}>{eyebrow && <Text type="label" color="accent">{eyebrow}</Text>}<Heading level={1} type="display-2">{title}</Heading>{children && <Text color="secondary">{children}</Text>}</VStack>;
}
export function Detail({label, children}: {label: string; children: ReactNode}) {
  return <details><summary>{label}</summary><VStack gap={3} paddingBlock={3}>{children}</VStack></details>;
}
export function Filter({label, value, onChange, options, all = true}: {label: string; value: string; onChange: (value: string) => void; options: {value: string; label: string}[]; all?: boolean}) {
  return <Selector label={label} value={value} onChange={onChange} hasSearch={options.length > 8}
    options={all ? [{value: '', label: `All ${label.toLowerCase()}`}, ...options] : options} />;
}
export function LoadState({error, retry}: {error?: string; retry?: () => void}) {
  return <Section padding={0} paddingBlock={6}><VStack gap={3} role="status"><Text>{error ?? 'Loading research data…'}</Text>{error && retry && <Button label="Try again" onClick={retry} />}</VStack></Section>;
}
export function Empty({reset}: {reset: () => void}) {
  return <VStack gap={3} paddingBlock={6}><Heading level={2}>No matches</Heading><Button label="Clear filters" onClick={reset} /></VStack>;
}
export function Pager({page, total, size, onChange}: {page: number; total: number; size: number; onChange: (page: number) => void}) {
  const pages = Math.max(1, Math.ceil(total / size));
  return <HStack gap={3} hAlign="between" wrap="wrap"><Text type="supporting" role="status">{total ? `${page * size + 1}–${Math.min((page + 1) * size, total)}` : '0'} of {total.toLocaleString()}</Text><HStack gap={2}><Button label="Previous" isDisabled={page === 0} onClick={() => onChange(page - 1)} /><Text>Page {page + 1} / {pages}</Text><Button label="Next" isDisabled={page + 1 >= pages} onClick={() => onChange(page + 1)} /></HStack></HStack>;
}
export function SourceCode({code, title, language = 'plaintext'}: {code: string; title: string; language?: string}) {
  return <CodeBlock code={code} title={title} language={language} width="100%" maxHeight="var(--embedgym-code-height)" isWrapped hasLineNumbers container="section" />;
}
export function PillLine({items}: {items: string[]}) {
  return <HStack gap={3} wrap="wrap">{items.map(item => <Text key={item} type="supporting" color="accent">{item}</Text>)}</HStack>;
}
