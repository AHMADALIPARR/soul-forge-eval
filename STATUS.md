# STATUS — Soul Forge Eval

Public: AHMADALIPARR/soul-forge-eval (published 2026-11-07).

## Verified by execution (2026-11-07, after the console merge)

- Engine mechanics (Godot 4.3 headless, `engine/main.gd`): checks
  hold and trip correctly; the verdict chain verifies; a tampered
  chain is refused. Demo panel: deterministic-assertions HELD (the
  planted false claim), reliability-trials HELD (pass@k true /
  pass^k false on the flaky case), cost-latency-metrology PASS,
  judge-alignment OFF by toggle; overall HELD -> revise. The hold
  is the gate working, not a failure.
- Console contract check (`frontend`, `npm run check`): all green —
  the MDX frontend and the engine agree on `templates/templates.json`.
- Console unit tests (`npm run test:unit`): 22/22 pass, including
  zero-trial reliability = INVALID, hostile-recording inertness, and
  requested-vs-effective temperature semantics.
- Console build (`npm run build`): clean Vite production build.
- Console e2e (`npm run test:e2e`, Playwright + Chromium, desktop
  and mobile projects): 14/14 pass.

## Limits, stated plainly

- The evaluated subject is a deterministic stand-in. Wiring a live
  model seat (Ollama / swarm endpoint) behind the subject Callable
  is future work; no runtime is connected to the console, and the
  console says so (Runtime: Disconnected).
- Console demo data is sample data, labelled as demo in the UI.
  In demo mode the temperature Apply control is a simulation; the
  effective state reads not_applied.
- The judge template kind is a recognised refusal, not an
  implementation.
- The engine's verdict chain canonical form is insertion-ordered
  JSON within a run; cross-process persistence is future work.
- Metrology budgets are calibrated to the demo subject, not to
  model inference.
- GitHub Pages: `.github/workflows/pages.yml` builds and deploys
  `frontend/dist` on push to main. Until the first workflow run
  lands, the site URL serves the default Jekyll rendering of this
  repository's README instead of the console.
