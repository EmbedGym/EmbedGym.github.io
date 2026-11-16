// Adapted from Astryx's centered-hero template with one shared page gutter.
import {useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Text, Heading} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {Section} from '@astryxdesign/core/Section';

function HardwareLoop() {
  return (
    <svg viewBox="0 0 900 220" width="100%" role="img" aria-labelledby="loop-title">
      <title id="loop-title">Concept diagram: change a sensor input, execute the MCU binary, and inspect hardware state.</title>
      <g fill="none" stroke="var(--color-border)" strokeWidth="1">
        <path d="M100 28V184M140 28V184M180 28V184M220 28V184M260 28V184M300 28V184M340 28V184M380 28V184M420 28V184M460 28V184M500 28V184M540 28V184M580 28V184M620 28V184M660 28V184M700 28V184M740 28V184M780 28V184M820 28V184M100 44H820M100 84H820M100 124H820M100 164H820" opacity="0.35" />
      </g>
      <g fill="none" strokeWidth="2">
        <path d="M230 93H315V115H385" stroke="var(--embedgym-signal)" />
        <path d="M510 115H585V93H670" stroke="var(--color-accent)" />
        <path d="M730 140V184H170V140" stroke="var(--embedgym-verified)" strokeDasharray="5 6" />
      </g>
      <g fill="var(--color-background-surface)" strokeWidth="2">
        <rect x="110" y="48" width="120" height="94" rx="12" stroke="var(--embedgym-signal)" />
        <rect x="385" y="54" width="125" height="94" rx="6" stroke="var(--color-accent)" />
        <rect x="670" y="48" width="120" height="94" rx="12" stroke="var(--embedgym-verified)" />
      </g>
      <g stroke="var(--color-accent)" strokeWidth="3">
        {[405, 425, 445, 465, 485].map(x => <path key={x} d={`M${x} 43V54M${x} 148V159`} />)}
      </g>
      <g fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M132 108H146L155 77L169 119L183 84L192 108H208" stroke="var(--embedgym-signal)" />
        <path d="M695 96L714 114L756 77" stroke="var(--embedgym-verified)" />
      </g>
      <g fontFamily="var(--font-family-body)" textAnchor="middle" fill="var(--color-text-primary)">
        <text x="170" y="26" fontSize="15">CHANGE INPUTS</text>
        <text x="447" y="26" fontSize="15">RUN THE BINARY</text>
        <text x="730" y="26" fontSize="15">INSPECT STATE</text>
        <text x="447" y="107" fontSize="23" fontWeight="600" fill="var(--color-accent)">MCU</text>
        <text x="450" y="211" fontSize="14" fill="var(--embedgym-verified)">Observe · revise · test again</text>
      </g>
    </svg>
  );
}

export default function ThemePreview() {
  const [showExample, setShowExample] = useState(false);
  return (
        <VStack gap={10} padding={6} width="100%"
          maxWidth="var(--embedgym-content-width)" style={{marginInline: 'auto'}}>
          <Section padding={0} paddingBlock={4} dividers={['bottom']}>
            <HStack hAlign="between" vAlign="center" wrap="wrap" gap={3}>
              <Text type="large" weight="bold" color="accent">EmbedGym</Text>
              <Text type="supporting">A virtual hardware lab for coding agents</Text>
            </HStack>
          </Section>
          <VStack gap={6} hAlign="center">
            <VStack gap={3} hAlign="center">
              <Text type="label" color="accent">CODE MEETS HARDWARE.</Text>
              <Heading level={1} type="display-1" justify="center" textWrap="balance">
                Develop and debug embedded firmware<br />without physical hardware.
              </Heading>
              <Text type="body" color="secondary" justify="center" textWrap="balance">
                EmbedGym lets coding agents change sensor inputs, inspect hardware states,<br />
                and test the same binary that runs on a physical board.
              </Text>
            </VStack>
            <HStack gap={3}>
              <Button label={showExample ? 'Hide task example' : 'Show task example'}
                variant="primary" onClick={() => setShowExample(value => !value)} />
              <Button label="Research scope" variant="ghost" href="#research-scope" />
            </HStack>
          </VStack>
            <VStack gap={6}>
              <VStack gap={2} hAlign="center">
                <HardwareLoop />
                <Text type="supporting">The interactive hardware loop · Concept illustration</Text>
              </VStack>
              <Section padding={0} paddingBlock={6} dividers={['top', 'bottom']}>
                <VStack gap={3}>
                  <Heading level={2}>A closer look at embedded agent debugging</Heading>
                  <Text color="secondary">Explore tasks, peripheral models, and the steps an agent takes to find a hardware bug.</Text>
                  <Text color="accent">Tasks → Hardware models → Agent trajectories → Verified behavior</Text>
                </VStack>
              </Section>
              {showExample && (
                <Section padding={0} paddingBlock={6} dividers={['bottom']}>
                  <VStack gap={3}>
                    <Heading level={2}>When zero UV hides a firmware bug</Heading>
                    <Text>The firmware compiles and prints UV: 0 in a static indoor environment.</Text>
                    <Text>Set the UV input to 1500. If the reading stays at zero, the agent can trace the failure to the sensor mode register.</Text>
                    <Text color="secondary">Illustrative summary of the paper’s motivating example; this preview does not execute firmware.</Text>
                  </VStack>
                </Section>
              )}
              <Section id="research-scope" padding={0} paddingBlock={6}>
                <VStack gap={3}>
                  <Heading level={2}>Research scope</Heading>
                  <HStack gap={10} wrap="wrap">
                    {[
                      ['598', 'tasks across 117 specifications'],
                      ['41', 'peripheral models'],
                      ['6', 'MCU–framework pairs'],
                    ].map(([value, label]) => (
                      <VStack gap={1} key={label}>
                        <Text type="display-2" color="accent" hasTabularNumbers>{value}</Text>
                        <Text color="secondary">{label}</Text>
                      </VStack>
                    ))}
                  </HStack>
                  <Text color="secondary">Arduino · ESP-IDF · Zephyr</Text>
                </VStack>
              </Section>
            </VStack>
          <Text color="secondary" justify="center">Theme preview · Neutral typography · White surfaces · Light mode</Text>
        </VStack>
  );
}
