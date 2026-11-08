# STATUS

## What runs, verified in this workspace

- The GDScript engine (`engine/`, Godot 4.3 headless): mechanics
  checks 13/13 — the five assertion kinds, the hash-chained verdict
  ledger (entries numbered, renumbering refused, tampering
  refused), and the semantics-audit fixes: a zero-trial reliability
  run is INVALID, an empty batch is INVALID, and metrology verdicts
  seal their timings labelled as observations, not estimators.
- The demo panel on the demo writer: Deterministic Assertions
  HELD (the planted false claim trips the honesty check),
  Reliability Trials HELD (the flaky case fails pass^k), Cost &
  Latency Metrology PASS, Judge Alignment OFF, verdict chain valid
  with 3 sealed verdicts. Overall: HELD -> revise.
- The document front end (`frontend/`): `npm run check` builds static
  HTML from `pages/console.mdx` and asserts the contract — no script
  in that build, the demo banner and the Disconnected runtime state
  render, the four template toggles match `templates/templates.json`.
  That build is a contract check. It is not the Pages site.
- The live console (`web/`): React, published by the Pages workflow
  from `web/dist`. Run GDScript engine boots the Godot 4.3 web export
  (`web/public/godot/`, threads off) and sends the template contract
  to `web_host.gd`, which calls the same panel runner as the CLI.
  The page displays the sealed report. It does not grade.
- The Pages workflow, on every push to main, runs the document
  contract check, builds `web/`, and deploys `web/dist`.

## Shape

- One implementation of the semantics: the GDScript engine, both
  headless (`main.gd`) and in the browser (`web_host.gd` → the same
  `panel_runner.gd`). The live page sends the contract and renders
  the seal. It contains no second implementation of evaluation.
- `frontend/` stays documents: MDX compiled at build time to static
  HTML + CSS, checked on every Pages run, not deployed.

## Limits

- The demo subject is a deterministic stand-in. Wiring a live
  runtime (an Ollama endpoint, a Soul Forge session) behind the
  console is future work; until then the honest runtime state is
  Disconnected.
- The verdict chain's canonical form is JSON.stringify of each
  record in insertion order within a run; cross-run chain
  verification is future work.
- The judge template kind is recognised and refused by default;
  implementing judge grading is future work, gated on the
  deterministic templates being proven in real use.
