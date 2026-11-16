import {HStack, VStack} from '@astryxdesign/core/Layout';
import {Text} from '@astryxdesign/core/Text';
import {useData} from '../data';
import {useEffect, useState} from 'react';

type Art = Record<string, {url: string; source: string}>;
let artRequest: Promise<Art> | undefined;
export function PartStrip({parts}: {parts: string[]}) {
  const [art, setArt] = useState<Art>({});
  useEffect(() => {
    let active = true;
    artRequest ??= fetch(`${import.meta.env.BASE_URL}hardware/manifest.json`).then(r => {if (!r.ok) throw new Error('Artwork unavailable'); return r.json();}).catch(() => {artRequest = undefined; return {};});
    artRequest.then(value => {if (active) setArt(value);});
    return () => {active = false;};
  }, []);
  return <HStack gap={4} wrap="wrap" vAlign="center">{parts.map(part => <VStack gap={1} hAlign="center" key={part}>
    {art[part] && <img src={`${import.meta.env.BASE_URL}${art[part].url}`} alt={`${part} component`} loading="lazy" style={{height: 'var(--embedgym-part-height)', maxWidth: 'var(--embedgym-part-width)', objectFit: 'contain'}} />}
    <Text type="supporting">{part}</Text>
  </VStack>)}</HStack>;
}
