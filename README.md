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

## The console

GitHub Pages serves the live console in `web/`: the messaging surface
(roster, stream, inspector) plus the eval panel. **Run GDScript
engine** loads the Godot 4.3 web export and asks the same runner the
CLI uses. The page does not recompute a pass, a trial count, or a
hash. Toggles are sent as the contract; a seal that is replaced fails
the engine's own verify.

`frontend/` is the script-free document render of the same console.
Its contract check still runs in the Pages workflow. It is not what
Pages publishes.

Live: https://ahmadaliparr.github.io/soul-forge-eval/

## The build session (`media/swarm-build.mp4`)

[The NOREPLY crew building this console](media/swarm-build.mp4) —
Architect, Engineer, Mathematician, and Red Team seats working the
blueprint, the semantics review, and the implementation, with their
own confidence labels (Tested / Not proven / Not checked) left in.

## Verify

- Engine: `engine/` under Godot 4.3 headless (`main.gd`) — mechanics
  suite plus the demo panel. The browser build is `web/public/godot/`
  (threads off), driven by `web_host.gd`.
- Document frontend: in `frontend/` — `npm run check`.
- Live console: in `web/` — `npm run build`. Pages deploys `web/dist`.

Architecture reference: the TideOS Eval Kit (TechTideOhio, MIT) —
decoupled engines behind a fail-closed orchestrator. This repo is
the counterpart in GDScript and React: same separation, verdicts
sealed.

License: SNAPKITTY OPAQUE SOURCE LICENSE v1.0 — see `LICENSE`.
Owners: Nova Parr, Ahmad Ali Parr, and Team HoloTwinKitty.
