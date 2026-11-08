# Soul Forge Eval

An evaluation engine in GDScript with an MDX template-control frontend.

A writer produces output. This panel grades it. The writer never sees the
checks and never grades itself; every verdict is appended to a hash-chained
ledger before it is reported, and any enabled gate can hold the result —
**HELD -> revise** — instead of letting it apply.

## The two halves

**Engine (`engine/`)** — a Godot 4 project. `eval_engine.gd` grades a
subject (any Callable) under template kinds:

- `assertions` — deterministic checks: exact, contains, key-equals,
  numeric tolerance, length bounds. No judge, no opinion.
- `reliability` — N trials per case; reports pass@k beside pass^k and
  the gate reads pass^k, the strict one.
- `metrology` — per-case elapsed time and output size against a budget.
- `judge` — recognised and refused by default: no judge is trusted until
  the deterministic gates are proven.

`verdict_chain.gd` seals each verdict into an append-only SHA-256 chain.
`demo_subject.gd` is a stand-in writer — right about arithmetic, honest
about its identity, flaky under repetition, and wrong once, confidently,
about an open problem — so the panel's trips are visible in its own demo.
`main.gd` runs the engine's mechanics checks and then the demo panel,
headless:

```
godot --headless --path engine --script main.gd -- ../templates/templates.json
```

**Frontend (`frontend/`)** — the template control. `pages/eval-console.mdx`
mounts `components/EvalConsole.jsx`, which renders one
`TemplateToggle` per entry in `templates/templates.json`. The JSON file is
the single source of truth for both halves: the engine runs the templates
whose toggle is on; the panel renders exactly those toggles; nothing is
hardcoded on either side. `console.css` carries the SnapOS panel language —
near-black ground, thin borders, monospace readouts. Verify the contract
with `npm run check` in `frontend/`.

## Reference

The architecture reference is the TideOS Eval Kit by TechTide AI
(TechTideOhio, MIT): fifteen decoupled Rust evaluation engines and the
binnacle orchestrator. This project is the same separation — grader apart
from graded, deterministic gates before judges, fail-closed — expressed in
GDScript with a control surface.

## Messaging console (frontend/src, static React build)

`frontend/src/` is a light, conversation-first console for agent-to-agent
messages, built with React + Vite into a static site for GitHub Pages
(base `/soul-forge-eval/`). The MDX page and its contract check above are
unchanged and still run with `npm run check`.

- **Honest sources.** This build ships with no runtime connected, so it
  says *Runtime: Disconnected* and shows no messages. You can import a
  recording (shown as *Recorded*, even if it was originally live) or opt in
  to a demo, which carries a persistent DEMO banner and a sample label on
  every message and is stored separately from recorded data.
- **Versioned envelopes.** `src/lib/schema.js` validates AgentEvent v1,
  TemperatureCapability v1, ConfigAck v1 and Recording v1. Events are
  ordered by runtime sequence per run and source, deduplicated by
  event_id; conflicts, stale, malformed and oversized events are
  quarantined, and gaps are shown until filled or explicitly skipped.
- **Public activity only.** Thinking/Working/Waiting tags and progress
  summaries are what an agent reported; fields such as
  `private_reasoning` are dropped and never rendered. Live activity that
  has expired is shown as Unknown.
- **Temperature.** Per agent, driven by the provider capability.
  Requested (draft), pending and effective are separate; only a correlated
  runtime acknowledgment changes the effective value, which otherwise reads
  `not_applied`. Unsupported or unknown models cannot be set.
- **Evaluation.** Template switches render from `templates/templates.json`
  and edit a browser draft only. Reliability shows the engine's batch
  booleans as observations, not estimators; a zero-trial template is
  marked INVALID. The ledger is described as in-memory hash links: not
  durable, not replay-safe, not authenticated.
- **No backend.** No runtime, worker, VM or container is provided or
  provisioned. A future runtime would plug in behind the adapter boundary
  described in the design notes.

```
cd frontend
npm ci
npm run check        # original MDX + toggle contract
npm run test:unit    # node --test: ordering, schemas, temperature, semantics
npm run build        # vite production build -> dist/
npm run test:e2e     # Playwright on the built site, desktop + mobile, screenshots
```
