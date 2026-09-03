# The Analyst · Console — change note

> Branch `feat/the-analyst-console` (from `origin/master` 0ce31a9). Written 2026-09-03 for the 2026-09-04 executive demo.
> Do **not** merge to `master` without review — `master` auto-deploys the live console.

## 1. Why

The live console (https://analyzer-mgmt-frontend.onrender.com) shows "Failed to load engines" because
`frontend/src/lib/api.ts` defaulted `ANALYZER_V2_URL` to the dead `https://analyzer-v2.onrender.com` and the
`NEXT_PUBLIC_ANALYZER_V2_URL` variable was never set on Render. 17 of 23 sidebar pages plus Jobs call that host
directly. The backend is now "The Analyst" (fork of analyzer-v2, same 27 route families) at
`https://the-analyst-kcuc.onrender.com`.

On top of the repoint, the console gains a **Runs** list and a **Run Console** — the "look under the hood" page:
a ten-step methodology where the output of one step feeds the next, with prompts, outputs, tokens, cost and duration
per node, and an executive view that hides the internals.

## 2. Changelog

### Repoint (task 1)
- `frontend/src/lib/config.ts` (new) — single exported `ANALYZER_V2_URL` (default `https://the-analyst-kcuc.onrender.com`) and `API_BASE`.
- `frontend/src/lib/api.ts:83-85` — imports/re-exports the constants; `:96-127` adds `HttpError`, `fetchV2`, `fetchV2OrNull` (404 → `null`).
- Page-level copies replaced by the import: `objectives/index.tsx:6`, `objectives/[key].tsx:21`, `objectives/new.tsx:18`, `plans/index.tsx:7`, `plans/[id].tsx:44`.
- `frontend/.env.example` (new) — documents both variables; `render.yaml` (new, repo root) — both services (frontend node: `cd frontend && npm install && npm run build` / `cd frontend && npm start`, env `NEXT_PUBLIC_ANALYZER_V2_URL`, `NEXT_PUBLIC_API_URL`; api python, unchanged).
- `frontend/src/components/Layout.tsx` — brand "The Analyst · Console" (`:110-117`), sidebar grouped into **Story** (Objectives, Plans, **Runs** `:57`) and **Definitions** (unchanged order), Settings link now resolves (`:179`, page below).
- `frontend/src/pages/settings.tsx` (new) — shows the two backend URLs and live health probes (engines, workflows, executor, dossier route, legacy mgmt-api). Fixes the 404 Settings link.

### Cherry-pick c365b2c (task 2) — commit 7c5192a
- Plans → **Jobs** tab, `annotated_prose` sub-renderer option/default, ui-docs. Applied cleanly.
- Bug fixed in `plans/[id].tsx:823-826`: analyzer-v2 `GET /v1/executor/jobs` ignores `plan_id` (accepts only status/limit/project_id) so the tab now filters client-side (`jobs.filter(j => j.plan_id === planId)`).
- Each job row now links to **Open run console** (`/jobs/{id}/console`, `:909-912`) with the runtime inspector as secondary link.

### Runs list (task 3)
- `frontend/src/pages/jobs/index.tsx` (new, 393 lines) — executor jobs (`GET /v1/executor/jobs?limit=50`, auto-refresh 5 s while anything runs) with status pip, run id + workflow, plan (thinker · target from `/v1/orchestrator/plans`), step progress bar, created + elapsed, calls · tokens, cost, Console/Inspector links; filters (search, status, workflow). Cost comes from `GET /v1/events/{id}/summary`; the ledger is probed once (first job) and only fanned out when it exists.
- Dossier jobs section (`GET /v1/dossier/jobs`) — 404 handled: shows "will appear once deployed"; when available, rows link to the console of `analysis_job_id || job_id`.

### Run Console (task 4)
- `frontend/src/pages/jobs/[id]/console.tsx` (new, 406 lines) — data: `GET /v1/executor/jobs/{id}` (poll 3 s while running), `GET /v1/orchestrator/plans/{plan_id}`, `.../pipeline-visualization`, `GET /v1/executor/jobs/{id}/results`, `.../phases/{n}` (prose for the selected step), `GET /v1/events/{id}/summary`, and the events feed.
- `frontend/src/lib/events.ts` (new) — `useRunEvents`: replay `GET /v1/events/{id}?after=seq` → SSE `GET /v1/events/{id}/stream` (event `run_event`) while running → falls back to 2 s polling; 404 ⇒ status `unavailable` and the page degrades to plan + results + stored prose. Dev: `?fixture=1` (+`&replay=1` animates, `&exec=1` executive).
- `frontend/src/components/console/model.ts` (new) — `buildConsoleTree` merges pipeline-visualization (or plan phases) with events and executor progress into phases → chains → engines → passes → calls, with per-node status and rolled-up tokens/cost/duration; `defaultSelection` follows the deepest running node.
- `frontend/src/components/console/PhaseTree.tsx` — lifted from the-critic `PipelineVisualization.tsx` (live pips, auto-expand running phases) and re-expressed over the model with per-node stats.
- `frontend/src/components/console/NodeDetail.tsx` — breadcrumb path, stats row, "why this step", stance, dependencies (clickable), **prompt excerpt | output excerpt** side by side (mono, wrapping), hash/chars/payload_json (developer), children list. Executive view: narration lines ("In plain words"), plain description, "What came out" in serif prose, no hashes/JSON/prompt internals.
- `frontend/src/components/console/Timeline.tsx` — kind-coloured event list (`KindChip`), click → selects the node; executive view keeps job/phase/narration/artifact/failure events only.
- `frontend/src/components/console/widgets.tsx` — `StatusPip`, `StatusTag`, `StatChip`, `KindChip`, `CostMeter` (spent vs `estimated_total_cost_usd`, tokens, calls, elapsed, live indicator), `Toggle`.
- Top strip: objective (`research_question`), strategy (`decision_trace.overall_strategy_rationale` / `strategy_summary`), collapsible **Alternatives considered** grouped per step from `decision_trace.phase_decisions`.
- Links to the console from Runs, Plans → Jobs, and the inspector header (`jobs/[id].tsx:1561-1566`).
- Types: `frontend/src/types/index.ts:2178-2364` (`RunEvent`, `RunEventsSummary`, `JobResultsResponse`, `PhaseOutputsResponse`, `Pipeline*Viz`, `DossierJobSummary`). API: `api.ts:737-796` (`executorJobs.results/phaseOutputs`, `plans.get/pipelineVisualization`, `runEvents.list/summary/streamUrl`, `dossierJobs.list`).
- Fixture: `frontend/src/fixtures/events-sample.json` (229 KB; trimmed from live plan `plan-ef57a3fb980c` / job `job-b794ea5b004a`, 7-phase intellectual genealogy of Varoufakis; 147 synthetic events, run left "in progress" in the last step). Loaded by dynamic import only when `?fixture=1`.

### Design pass (task 5)
- `frontend/tailwind.config.js:25-52` — tokens `ink` (near-black scale), `paper` (off-white), `gold` (one accent); `fontFamily.display` serif stack (Iowan Old Style / Palatino / Georgia — no webfont dependency).
- `frontend/src/styles/globals.css:104-144` — `.mono-label`, `.display-title`, `.console-surface`, `.console-panel(-light)`, `.pip-*` with `pip-pulse`, `.excerpt`.
- Applied to Layout (dark sidebar, gold active rule), Runs (paper canvas, serif title, mono labels) and Console (ink surface). The other 22 pages are untouched.

## 3. Deploy

1. Render → service **analyzer-mgmt-frontend** (`srv-d5th0tali9vc73a8dakg`) → Environment → add
   `NEXT_PUBLIC_ANALYZER_V2_URL=https://the-analyst-kcuc.onrender.com` (and keep `NEXT_PUBLIC_API_URL`).
2. Merge `feat/the-analyst-console` → `master` (auto-deploys) **or** Manual Deploy → "Clear build cache & deploy".
   `NEXT_PUBLIC_*` is inlined at build time — setting the variable without a rebuild changes nothing.
3. Smoke: `/engines` shows "207 analytical engines", `/jobs` lists runs, `/jobs/{id}/console` renders a tree; `/settings` shows green probes.
4. `render.yaml` is now committed so the two services can be recreated from the repo (Blueprint) if the dashboard config is ever lost.

Until the events ledger (`/v1/events/*`) and `/v1/dossier/jobs` are deployed on The Analyst, the Runs cost column shows "—" and the Console degrades to plan + results + stored prose (prompts are not recorded there). The fixture URL `/jobs/job-fixture-varoufakis/console?fixture=1&replay=1` demonstrates the live behaviour without a backend.

## 4. Verification (2026-09-03, local dev server, isolated headless Chromium 1440×900)

`cd frontend && npm install && npm run build` — passes (all 52 pages compile; `/jobs` 7.0 kB, `/jobs/[id]/console` 14.8 kB). `npx tsc --noEmit` clean.

Dev server started with `NEXT_PUBLIC_ANALYZER_V2_URL=https://analyzer-v2-3blo.onrender.com` (the client's frozen production service, GETs only):

| Check | Result |
|---|---|
| `/engines` against the live backend | "207 analytical engines across 14 categories" — the repoint works (the old default gave "Failed to load engines"). Note: that backend answered `/v1/engines` in ~1 s at first and in 96 s later in the session (Render cold/slow), unrelated to the console. |
| `/jobs` | 50 executor rows with plan/steps/tokens; dossier section shows the "will appear once deployed" note (route 404s there); cost column "—" with one ledger probe (no per-row 404 storm). |
| `/jobs/job-fixture-varoufakis/console?fixture=1` (developer) | 7 steps in the tree, 147 events on the timeline, default selection follows the running call ("Comprehensive Genealogical Synthesis" · call #147), prompt hash + payload visible, spend "$23.01 of ~$38.50 planned", 3 alternative-cards open on click, tree click selects a step and shows "follow live". |
| `…&exec=1` (executive) | Toggle reads "Executive view"; no prompt hash, no `payload_json`, no call rows in the tree; "In plain words" narration and "What came out" shown; timeline "narrated". |
| `…&replay=1` | After 4 s: 9 events revealed, 5 pulsing pips (live-progress behaviour). |
| `/settings` | 200; probes render (engines count green; legacy mgmt-api red locally because nothing listens on :8002 — expected). |
| `/plans/plan-ef57a3fb980c` → Jobs tab | Only that plan's 3 jobs listed (client-side filter), each with "Open run console". |
| `/jobs/job-b794ea5b004a/console` (real completed job, backend without ledger) | Degrades cleanly: 7 steps from pipeline-visualization, "events: unavailable", stored prose shown as output, prompt panel explains the ledger is not deployed; stale `phase_statuses['4.0']='running'` from the executor no longer shows the last step as in progress once the job is completed. |
| `/jobs/job-b794ea5b004a` | "Run console" button present in the inspector header. |

Screenshots (viewport): `frontend/docs/screens/01-engines-live-backend.png`, `02-runs-list.png`, `03-console-developer.png`, `04-console-executive.png`.

Not verified: SSE/polling against a real events ledger (not deployed yet at the time of writing); The Analyst host itself (`the-analyst-kcuc` returned 502 while provisioning) — the code default points there, verification used the frozen twin.

## 5. Left open
- Executive-facing copy on the other 22 pages, 5-group sidebar and "executive mode" app-wide (tracker P2).
- `RunEvent` field names were built to the tracker spec; `pass_name` matching against the plan's pass labels is tolerant (label / `pass_N` / stance) but should be checked against the real ledger once it streams.
- `GET /v1/events/{id}/summary` field names (`total_cost_usd` vs `cost_usd`) are read leniently; confirm with the events agent.
- The `@caii/analysis-renderers` dependency and stray the-critic Playwright scripts from the recovery checkout were intentionally not brought over.
