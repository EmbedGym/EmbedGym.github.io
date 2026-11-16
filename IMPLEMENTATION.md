# EmbedGym implementation and verification

The approved proposal is the full scope. Nothing is published or pushed until requested.
All pages are English, white/light, with the maintained Neutral extension and one shared container.

Scott's editorial correction: remove distracting explanatory detail from primary surfaces. Make the experience interactive, not text-led. Every figure and table needs meaningful interaction. Methodology/provenance/source detail belongs behind disclosure. This applies to all existing pages as well as remaining work.

## Acceptance checklist

- [ ] Overview: correct MCU/framework/peripheral/task/run figures, working navigation, embedded real workbench. Scott explicitly removed the `98.3% physical agreement` headline metric.
- [ ] Editorial/interaction audit: concise primary surfaces; every figure/table has useful interaction; no long methodology or implementation prose shown by default.
- [ ] Workbench: circuit, serial/scope, reference and real L1/L3 firmware, streamed test stimuli and checks, six curated examples. Label browser execution, backend execution, and recorded replay distinctly.
- [ ] Hardware: six targets with board art, CPU/clock/emulator/toolchain/timing/task counts; 41 peripherals with filters, art, modeling depth, exact CLI usage, and evidence-specific target coverage.
- [ ] Benchmark: all 117 specifications / 598 instances; real circuit art; target/part/protocol/domain filters; eight-model L1/L2/L3 results; target-specific pinouts/overlays and test plans; supported live execution.
- [ ] Leaderboard: global and six target views, eight models, three levels; EmbedAgent/AutoEmbed comparisons; protocol/framework and cost/steps/token breakdowns.
- [ ] Runs: all 14,352 paper-cohort runs; model/target/task/outcome-transition filters; circuit, checks, final source, actual command/output steps; AVR artifact replay.
- [ ] Synthesis: five stages linked to actual source artifacts.
- [ ] Physical validation: real testbed imagery and 59/60 outcome agreement with provenance.
- [ ] Reproducible static data export: cohort checks, provenance, no dependency on sibling checkouts at site build/runtime, no raw environment or credential export.
- [ ] Browser QA: desktop/mobile, aligned gutters, no overflow, navigation/filter/detail/error states; real reference-pass and agent-failure AVR grading; cleanup on switch/unmount.
- [ ] Gates: theme freshness, TypeScript, production build, Astryx doctor; asset size and completeness audit; requirement-by-requirement final evidence.

## Evidence and limits

- Authoritative cohort: `cli/testbench/paper/eval_leaderboard.py`, exact eight models and intersection of graded tasks across `nosim`, `sim_s`, and `sim` per target/model. Other local trajectories are not paper runs.
- Four MCU models use three instruction architectures. Do not repeat the proposal's incorrect “4 MCU Architectures” label.
- AVR runs locally with avr8js; ESP32-S3 and nRF52840 use QEMU/Renode services. Static hosting cannot itself run those server processes.
- Per-component `implemented` and `verified` records are distinct; do not claim all components are verified on all six targets.
- Some target-specific test vectors override shared vectors. Show the effective test file and its origin.

## Work log

- Repository setup and Pages workflow validated; manual deployment only, no push or publish.
- Original theme sample builds and passes Astryx doctor (20 passes, 2 warnings, 0 failures).
- Full implementation started with the source-backed data export and acceptance inventory.

### Merged demo integration (2026-11-16)

- Reused `demo/cells` from `d8face4f86cca4759a0b602e3cdbe9f128b5a7b7`, including authored circuits, custom hardware elements, serial/waveform artwork and deterministic animation functions. Local copies and original hashes are in `vendor/velxio/provenance.json`; `scripts/sync-demo.py` refreshes them without modifying the source checkout.
- Featured cards, all task cards and task details now use the same animated renderer. All 117 tasks / 598 framework instances map to 391 board/task cells. Pause/play, detail scrubbing, reduced-motion defaults and visibility-based loading are implemented.
- The run inspector uses the demo's pure trajectory reducer: writes/fixes, compiles, simulator observations, versions and diffs. It preserves per-call result pairing and unknown versions. Circuit highlights and supported visual properties follow actual recorded observations; no illustrative animation is used as trace evidence. Native framework commands and deferred output remain inspectable, but reconstruction is limited to the demo parser's supported Arduino edit forms. This is recorded playback, not firmware re-execution or a live agent/backend.
- Browser coverage harness mounted all 391 cells and sought six times per cell: 391 passed, 0 failed. Verified target switching, pause/play, version/diff selection, timed recorded output and scrubbing. Desktop (1440) and narrow (390) layouts retain their gutters with no document overflow; narrow trace navigation uses a compact step selector.
- Four trace regressions pass, including a real paper run whose reconstructed final sketch matches its saved submission. TypeScript, production build and theme freshness pass. Astryx doctor reports no failures (pre-existing external font warnings remain).
- No push, deployment, source-run mutation or live agent execution. The broader implementation checklist remains open.
