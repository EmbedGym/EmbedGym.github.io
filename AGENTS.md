# AGENTS.md

Project-specific guidance for AI coding agents.

## EmbedGym website direction

- Repository: `git@github.com:EmbedGym/EmbedGym.github.io.git`; local `main` tracks `origin/main`. Do not push or publish until Scott explicitly requests it. The local Pages workflow deploys only by manual dispatch on `main`.
- The site is in English; planning with Scott is in Chinese.
- Editorial priority: concise research showcase, interaction first. No long explanatory paragraphs on overview/catalog/dashboard surfaces. Keep only a short title, a one-line caption when necessary, and controls. Put methodology, provenance, implementation notes, detailed prompts and raw logs behind deliberate disclosure or on detail views.
- Every figure and table must be interactive: selection, comparison, filtering, sorting, playback or linked inspection must change useful visible content. A decorative hover effect does not count. Avoid static illustrations/tables as the main experience. Build live hardware interactions prominently.
- Scott removed the `98.3% physical agreement` headline metric. Do not reintroduce it.
- Use a minimal academic style with white backgrounds and light mode, including future task demos, circuit canvases, logs, and trajectory views. Do not inherit Velxio's dark surfaces.
- Keep Neutral as the base, but avoid a bland monochrome presentation: use restrained blue accents, clear typography, and hardware diagrams; reserve warm/green accents for stimulus and verified-state semantics.
- Keep one centered page container with shared gutters for the header, section text, and dividers. Avoid Section's negative-margin bleed canceling page padding or adding a second horizontal inset. Verify both narrow and wide viewports.
- Current scope is implementation of the approved research website proposal: live workbench, hardware library, benchmark, leaderboard, run inspector, synthesis pipeline, and physical validation. Track verification in `IMPLEMENTATION.md`. `src/ThemePreview.tsx` is the original visual sample.
- Plan searchable Tasks and Components catalogs, component modeling explanations, real agent trajectory playback, and experimental results.
- Extend the maintained Neutral package with `defineTheme`; do not eject a theme unless explicitly asked. Keep the generated theme module as the single app entry for theme selection.
- Paper source: `/Users/scott/dev/iot_agent_paper/main.tex` and its included sections, especially `sections/evaluation_v2.tex`.
- Benchmark source: `/Users/scott/dev/velxio-automation/cli/testbench`. Treat existing runs as read-only source material. Select and verify the paper's experiment cohort before exporting website data.
- Distinguish illustrative animations, recorded trace replays, and live firmware execution in the UI.

<!-- ASTRYX:START -->
Astryx v0.7.14 · 174 components
CLI: run every command as `npx astryx <cmd>` (shown below as `astryx ...`).

SETUP (once, in app entry e.g. main.tsx) — without these, components render unstyled:
  import "@astryxdesign/core/reset.css";
  import "@astryxdesign/core/astryx.css";

WORKFLOW — start every page from a template, never from scratch:
1. `astryx build "<idea>"` — names the template to scaffold from and the parts it lacks.
2. `astryx template <name> <path>` — scaffold it; keep its frame, gap and padding; replace the content.
3. `astryx template <Block>` for parts it lacks; `astryx component <Name>` to read props before using one.
Changing an existing page? Keep it: skip step 2 and add blocks/components inside its sections.
Before you deliver a build, run `astryx doctor --built <dir>`; don't deliver it if it fails.

RULES:
- No <div> — components handle all layout and spacing.
- Read `astryx docs layout` before changing a template's frame.
- Dense data = rows (Table, List/Item), not Card-wrapped lists. Badge = counts only.
- Style with component props first, then tokens (var(--color-*|--spacing-*|--radius-*)). No raw hex/px. No StyleX/Tailwind compiler here — don't use xstyle/utility classes directly. Some templates use StyleX and need a compiler plugin; see `astryx docs styling-overview`.
- Palettes and custom colors go through the theme, never :root overrides. Run `astryx theme add <slug>` to import; `theme eject <slug>` only forks source. See `astryx docs theme`.
- SELF-CHECK: re-read the file; replace any raw <div>/<span>, imported .css/@apply, or hardcoded #hex/px with the component or a token.

`astryx help` lists every command. Key ones beyond the workflow:
  search "<query>"   find any component / hook / doc / template
  discover <words>   integrations you could add
  docs <topic>       getting-started, principles, tokens, theme … (`astryx docs` lists all)
  docs cli           commands and API reference
  docs authoring     build an integration package, and every field it holds
  upgrade --from <old version> --apply   run after a dependency bump
<!-- ASTRYX:END -->
