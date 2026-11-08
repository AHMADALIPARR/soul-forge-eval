# Soul Forge Eval

[![License: SnapKitty Opaque 1.0](https://img.shields.io/badge/license-SnapKitty%20Opaque%201.0-blue)](LICENSE)
[![Godot](https://img.shields.io/badge/Godot-4.3-478cbf)](https://godotengine.org/)
[![Live Console](https://img.shields.io/badge/live-console-brightgreen)](https://ahmadaliparr.github.io/soul-forge-eval/)

**Canonical repository:** https://github.com/AHMADALIPARR/soul-forge-eval

An evaluation engine and console built on one rule: **agents do not grade their own work.** A writer proposes; separate templates judge; every verdict seals into a SHA-256 hash chain that refuses tampering.

## Live console

The live console is served from GitHub Pages:

**https://ahmadaliparr.github.io/soul-forge-eval/**

It shows the messaging surface (roster, stream, inspector) plus the eval panel. **Run GDScript engine** loads the Godot 4.3 web export and asks the same runner the CLI uses. The page does not recompute a pass, a trial count, or a hash. Toggles are sent as the contract; a seal that is replaced fails the engine’s own verify.

## Architecture

| Component | Location | Role |
|-----------|----------|------|
| Engine | `engine/` | GDScript on Godot 4.3, run headless or as a web export |
| Templates contract | `templates/templates.json` | Single source of which templates are enabled |
| Live console | `web/` | React UI published to GitHub Pages |
| Document frontend | `frontend/` | Script-free MDX render used for contract checks |
| Demo subject | `engine/demo_subject.gd` | Deterministic stand-in with planted flaws |

### Template kinds

- **deterministic-assertions** — exact / contains / key-equals / numeric-close / length checks against the subject’s output.
- **reliability-trials** — pass@k reported beside pass^k; the gate reads pass^k. A batch with zero trials is INVALID, never a pass.
- **cost-latency-metrology** — per-case time and size budgets.
- **judge-alignment** — recognised as a template kind and refused by default. A judge is a separate seat or it is nothing.

Verdicts append to a hash-chained log; a tampered chain fails verification.

The demo subject is a deterministic stand-in: right on arithmetic, honest about its identity, flaky one time in four, and carrying one planted false claim — the panel’s job is to catch it.

## One contract

Which templates run is a toggle in `templates/templates.json`. The engine runs exactly the toggles that are on; both frontends render exactly those toggles. Nothing is hardcoded on either side.

## Verify

- **Engine:** `engine/` under Godot 4.3 headless (`main.gd`) — mechanics suite plus the demo panel. The browser build is `web/public/godot/` (threads off), driven by `web_host.gd`.
- **Document frontend:** in `frontend/` — `npm run check`.
- **Live console:** in `web/` — `npm run build`. Pages deploys `web/dist`.

## Status

See [STATUS.md](STATUS.md) for what has been verified in this workspace (mechanics 13/13, demo panel results, frontend contract check, Pages workflow).

## Build session

[The NOREPLY crew building this console](media/swarm-build.mp4) — Architect, Engineer, Mathematician, and Red Team seats working the blueprint, the semantics review, and the implementation, with their own confidence labels (Tested / Not proven / Not checked) left in.

## Architecture reference

The TideOS Eval Kit (TechTideOhio, MIT) — decoupled engines behind a fail-closed orchestrator. This repo is the counterpart in GDScript and React: same separation, verdicts sealed.

## License

SNAPKITTY OPAQUE SOURCE LICENSE v1.0 — see [LICENSE](LICENSE).

Owners: Nova Parr, Ahmad Ali Parr, and Team HoloTwinKitty.

---

**Repository:** https://github.com/AHMADALIPARR/soul-forge-eval  
**Live console:** https://ahmadaliparr.github.io/soul-forge-eval/
