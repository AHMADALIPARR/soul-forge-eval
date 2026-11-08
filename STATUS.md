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
- The front end (`frontend/`): `npm run check` builds the static
  site from `pages/console.mdx` and asserts the contract against
  the built output — no script ships, the demo banner and the
  Disconnected runtime state render, the effective temperature
  reads not_applied, every agent and recorded message from
  `data/demo-recording.json` renders, the four template toggles
  match `templates/templates.json`, and a hostile recording fixture
  renders as escaped text. The built page was rendered in headless
  Chromium and visually compared with the console design.
- The Pages workflow runs the contract check and the build on
  every push to main and deploys `frontend/dist`.

## Shape

- One implementation of the semantics: the GDScript engine. The
  front end displays the contract (`templates/templates.json`) and
  the recording data; it contains no second implementation of
  evaluation, event storage, schema, or temperature logic.
- The front end is documents: MDX compiled at build time to static
  HTML + CSS. Controls that would need a runtime (apply a
  temperature, import a recording) are shown disabled with the
  reason stated; nothing is simulated.

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
