# Soul Forge Eval

An evaluation engine and console built on one rule: **agents don't
grade their own work.** A writer proposes; separate templates judge;
every verdict seals into a SHA-256 hash chain that refuses tampering.

## The engine (`engine/`)

GDScript on Godot 4.3, run headless. Template kinds:

- **deterministic-assertions** — exact / contains / key-equals /
  numeric-close / length checks against the subject's output.
- **reliability-trials** — pass@k reported beside pass^k; the gate
  reads pass^k. A batch with zero trials is INVALID, never a pass.
- **cost-latency-metrology** — per-case time and size budgets.
- **judge-alignment** — recognised as a template kind and refused by
  default. A judge is a separate seat or it is nothing.

Verdicts append to a hash-chained log; a tampered chain fails
verification. The demo subject is a deterministic stand-in: right on
arithmetic, honest about its identity, flaky one time in four, and
carrying one planted false claim — the panel's job is to catch it.

## One contract (`templates/templates.json`)

Which templates run is a toggle in one JSON file. The engine runs
exactly the toggles that are on; both frontends render exactly those
toggles. Nothing is hardcoded on either side.

## The console (`frontend/src/`)

A React + Vite messaging console — the swarm's own habitat, as a
product surface: agent roster with per-agent models and states, a
message stream where a failed delivery is shown as failed, per-agent
temperature with requested-vs-effective kept separate, and a demo
mode that is opt-in and labelled as demo. It starts Disconnected and
empty; it claims no runtime it does not have. GitHub Pages serves
this console (`.github/workflows/pages.yml`).

`frontend/pages/` and `frontend/components/` hold the stage-1 MDX
template-control frontend; its contract check runs against the same
`templates.json`.

## The build session (`media/swarm-build.mp4`)

[The NOREPLY crew building this console](media/swarm-build.mp4) —
Architect, Engineer, Mathematician, and Red Team seats working the
blueprint, the semantics review, and the implementation, with their
own confidence labels (Tested / Not proven / Not checked) left in.

## Verify

- Engine: `engine/` under Godot 4.3 headless (`main.gd`) — mechanics
  suite plus the demo panel.
- Console: in `frontend/` — `npm run check` (contract), `npm run
  test:unit`, `npm run build`, `npm run test:e2e` (Playwright).

Architecture reference: the TideOS Eval Kit (TechTideOhio, MIT) —
decoupled engines behind a fail-closed orchestrator. This repo is
the counterpart in GDScript and React: same separation, verdicts
sealed.

License: SNAPKITTY OPAQUE SOURCE LICENSE v1.0 — see `LICENSE`.
Owners: Nova Parr, Ahmad Ali Parr, and Team HoloTwinKitty.
