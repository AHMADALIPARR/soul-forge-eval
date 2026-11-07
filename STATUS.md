# STATUS — Soul Forge Eval

Local only; not pushed. Built 2026-11-07.

## Verified by execution on this machine

- Engine mechanics (Godot 4.3 headless, `engine/main.gd`): 8/8 checks
  pass — exact/contains/key-equals/numeric-close checks hold and trip
  correctly; verdict chain verifies; a tampered chain is refused.
- Demo panel run against `templates/templates.json`: assertions HELD
  (planted false claim), reliability HELD (flaky case: pass@k true,
  pass^k false), metrology PASS, judge template skipped (toggle off).
  Chain valid, 3 sealed verdicts (one per enabled template). Overall
  HELD -> revise, exit code 0: the hold is the gate working.
- Frontend (`npm run check`): 8/8 — the MDX page compiles; the toggle
  contract holds (unique ids, enabled flags, engine-spoken kinds,
  data-driven console, no hardcoded template ids).

## Limits

- The subject under evaluation is a deterministic stand-in, not a live
  model. Wiring a real worker (an Ollama seat, a swarm role) behind the
  subject Callable is the next stage and has not been done.
- The MDX frontend is compile- and contract-verified only; it has not
  been rendered in a browser or served by a site generator here.
- The verdict chain's canonical form is insertion-ordered JSON within a
  run; cross-process persistence of chains is a later stage.
- Metrology budget (50 ms/case default) is calibrated for the demo
  subject's trivial work, not for model inference.
- The judge template kind is a recognised refusal, not an
  implementation: it exists on the panel so the decision to keep judges
  out is a visible control, not an absence.
