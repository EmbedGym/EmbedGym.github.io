# EmbedGym website

English research website with task animations and recorded experiment explorers.

## Local preview

```sh
nvm use
npm ci
npm run dev
```

The site uses the maintained Neutral theme on white surfaces. Task illustrations
reuse the demo's 391 animated cells. Agent traces replay recorded events and
recoverable code versions; they do not execute firmware or launch agents.

```sh
npm run build
npm run check:astryx
```

## GitHub repository and Pages

The SSH origin is `git@github.com:EmbedGym/EmbedGym.github.io.git`.
Local `main` tracks `origin/main` and preserves the existing repository history.
Setup alone does not commit, push, or publish the local preview.

The intended site URL is https://embedgym.github.io/. Vite uses `base: '/'`
because this is the organization's root site, not a project subdirectory.
Only the built `dist/` artifact is deployed; dependencies, source notes, and
local preview screenshots are not website artifacts.

`.github/workflows/pages.yml` runs a locked dependency install, generated theme
freshness check, TypeScript/build, and Astryx doctor on main pushes and PRs.
Deployment is manual while the website is still a preview. The workflow's
action revisions are pinned; Node is selected from `.nvmrc`.

When the website is ready to publish:

1. Review and commit the intended source files when ready.
2. In the repository's **Settings → Pages → Build and deployment**, set
   **Source** to **GitHub Actions**. This remote setting was not changed during
   local setup. Switch the source before the first source push if the existing
   branch-based placeholder must not be replaced by unbuilt Vite source.
3. Push the reviewed source when authorized; this runs the validation job.
4. In **Actions → Website checks and Pages deployment → Run workflow**, select
   `main`. The deploy job runs only for this manual event on `main` and only
   after all build steps succeed. It uses GitHub's built-in token; no personal
   access token or SSH private key belongs in the workflow.

Pushes alone do not deploy through this workflow. GitHub Pages is static
hosting: future real-time QEMU/Renode sessions need a separate backend. Future
client-side routing must use static page outputs or hash routes unless a Pages
fallback strategy is explicitly added.

References: [Vite Pages deployment](https://vite.dev/guide/static-deploy.html#github-pages)
and [GitHub Pages publishing sources](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Theme

Astryx Core, CLI, and Neutral are installed at 0.7.14. Agent conventions are in
`AGENTS.md` and `GEMINI.md`. `src/main.tsx` imports the generated theme registry
once and forces light mode. The `academic` theme extends the installed Neutral
package and makes page surfaces white. No theme was ejected.

To regenerate the custom theme after editing it:

```sh
npx @astryxdesign/cli theme build src/themes/academic/academicTheme.ts
```

The build and Astryx doctor pass without failures. Current warnings concern
external Figtree font verification, generated theme CSS imports, the template's
token-based inline frame styling, and dependency bundle size/client directives.

## Proposed content

- Overview: the firmware debugging problem, virtual hardware loop, selected demos.
- Tasks: all task specifications with target/framework filters and circuit views.
- Components: peripheral behavior, datasheet/driver basis, model and test evidence.
- Trajectories: real tool calls, outputs, edits, simulation actions, and grading.
- Results: paper-aligned comparisons, methodology, and downloadable research assets.

Start with the full catalog and 6–8 curated demo/replay stories. Live simulation
requires a separate runtime design, especially for QEMU/Renode and network tasks.

## Source inventory

Paper: `/Users/scott/dev/iot_agent_paper/main.tex` and its included sections.
Benchmark: `/Users/scott/dev/velxio-automation/cli/testbench`.

Inspected locally: 117 task directories, 598 target directories, and 14,381
trajectory files. The paper reports 14,352 evaluated trajectories, so a website
export must select the correct cohort instead of treating every local run as a
paper result. The checkout's `iot-skillsbench` directory is empty; task prompts
may be recovered from saved run workspaces or restored from the canonical source.

Reusable material includes `tasks/`, `results/bench/`, the `viewer/` parsers,
`teaser/` circuit rendering, and backend peripheral models with their unit tests.
No benchmark runs or source data were modified or published.

## Demo integration

`vendor/velxio/provenance.json` pins the imported demo source and original file
hashes. Upstream cell artwork retains its drawing coordinates and scoped styles;
website layout, controls and copy use Astryx. Build/runtime require no sibling checkout.

To refresh from the source checkout (Node 24 and Python 3):

```sh
python3 scripts/sync-demo.py --source /path/to/velxio-automation
node --test scripts/test-trace.mjs
npm run build
```

The four board animations cover 117 tasks and all 598 framework instances. ESP32
and nRF framework variants share their board's authored illustration, as in the
demo; benchmark test data and cohort exports are kept separate.

For browser coverage, open `/scripts/demo-qa.html` on the dev server and choose
**Check all 391 cells**. This harness is not in the production build. It mounts
every scene and seeks six frames, checking geometry and visible parts.

Trace navigation adapts the demo's reducer: Write/Fix, Compile, Simulate/Observe
and Submit. Only recovered source and recorded outputs are shown as evidence.
Unknown edits, deferred large outputs and native-framework steps retain access
to their original commands/output; earlier source is never replaced by the final
submission. The circuit highlights recorded interactions and applies exposed
visual properties only when they were actually read in the trace. Full firmware
re-execution and backend controls remain outside this recorded viewer.
