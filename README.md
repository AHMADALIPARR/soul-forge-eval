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
