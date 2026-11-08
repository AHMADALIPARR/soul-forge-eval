import { useMemo, useState } from "react";
import contract from "../../data/templates.json";
import type { EngineReport, TemplateSpec } from "../../lib/engine-types";
import { runGodot } from "../../lib/godot-host";

const FILE_TEMPLATES = contract.templates as TemplateSpec[];

function cloneTemplates() {
  return FILE_TEMPLATES.map((template) => ({ ...template }));
}

function sameContract(a: TemplateSpec[], b: TemplateSpec[]) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function EvalConsole() {
  const [templates, setTemplates] = useState<TemplateSpec[]>(cloneTemplates);
  const [phase, setPhase] = useState<"idle" | "loading" | "running" | "done" | "error">("idle");
  const [progress, setProgress] = useState<{ loaded: number; total: number } | null>(null);
  const [error, setError] = useState("");
  const [report, setReport] = useState<EngineReport | null>(null);
  const [ranWith, setRanWith] = useState<TemplateSpec[] | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const stale = ranWith != null && !sameContract(ranWith, templates);
  const fileMatch = sameContract(templates, cloneTemplates());

  const progressLabel = useMemo(() => {
    if (!progress || progress.total <= 0) return "Loading the Godot engine…";
    const pct = Math.min(100, Math.round((progress.loaded / progress.total) * 100));
    return `Loading the Godot engine ${pct}%`;
  }, [progress]);

  async function invoke(tamper: boolean) {
    setPhase((current) => (current === "idle" || current === "error" ? "loading" : "running"));
    setError("");
    const sent = templates.map((template) => ({ ...template }));
    try {
      const next = await runGodot(
        { templates: sent, tamper },
        {
          onLine: (line) => {
            setPhase((current) => (current === "loading" ? "running" : current));
            setLog((current) => [...current, line].slice(-80));
          },
          onProgress: (loaded, total) => setProgress({ loaded, total }),
        },
      );
      if (next.error && !next.panel) {
        setPhase("error");
        setError(next.error);
        setReport(next);
        return;
      }
      setReport(next);
      setRanWith(sent);
      setPhase("done");
    } catch (caught) {
      setPhase("error");
      setError(caught instanceof Error ? caught.message : "The engine failed.");
    }
  }

  const panel = report?.panel;
  const mechanics = report?.mechanics;

  return (
    <section className="sf-panel" aria-label="Evaluation panel">
      <header className="sf-panel-head">
        <span className="sf-panel-title">EVAL PANEL — TEMPLATE CONTROL</span>
        <span className="sf-panel-meta">
          {report?.godot ? `Godot ${report.godot}` : "Godot 4.3"} · GDScript · hash-chained
        </span>
      </header>
      <div className="sf-panel-body">
        {templates.map((template) => (
          <div className="sf-toggle-row" key={template.id} data-template-id={template.id}>
            <button
              type="button"
              role="switch"
              aria-checked={template.enabled}
              aria-label={`${template.title} (${template.kind})`}
              className={template.enabled ? "sf-toggle sf-toggle-on" : "sf-toggle sf-toggle-off"}
              onClick={() =>
                setTemplates((current) =>
                  current.map((item) => (item.id === template.id ? { ...item, enabled: !item.enabled } : item)),
                )
              }
            >
              <span className="sf-toggle-knob" />
            </button>
            <div className="sf-toggle-text">
              <div className="sf-toggle-title">
                {template.title} <span className="sf-toggle-kind">{template.kind}</span>
              </div>
              <div className="sf-toggle-desc">{template.description}</div>
            </div>
            <div className="sf-toggle-state">{template.enabled ? "RUNS" : "HELD OUT"}</div>
          </div>
        ))}
      </div>
      <div className="sf-engine">
        <div className="sf-row">
          <button
            type="button"
            className="sf-btn sf-btn-primary"
            disabled={phase === "loading" || phase === "running"}
            onClick={() => void invoke(false)}
          >
            {phase === "loading" || phase === "running" ? "Engine running" : "Run GDScript engine"}
          </button>
          <button
            type="button"
            className="sf-btn"
            disabled={phase === "loading" || phase === "running"}
            onClick={() => void invoke(true)}
          >
            Tamper a seal and re-check
          </button>
          <button
            type="button"
            className="sf-btn"
            disabled={fileMatch}
            onClick={() => setTemplates(cloneTemplates())}
          >
            Reset to templates.json
          </button>
        </div>
        <p className="sf-engine-status" role="status" data-phase={phase} data-overall={panel?.overall ?? ""}>
          {phase === "idle" && "Engine packed. Not invoked."}
          {phase === "loading" && progressLabel}
          {phase === "running" && "Running the GDScript panel…"}
          {phase === "error" && error}
          {phase === "done" && panel?.overall_line}
        </p>
        {stale && phase === "done" && (
          <p className="sf-engine-note">Toggles changed after this run. The lines below are the previous contract.</p>
        )}
        {mechanics && (
          <div className="sf-mech">
            <h3>Mechanics</h3>
            <ul>
              {mechanics.checks.map((check) => (
                <li key={check.name} data-pass={check.pass ? "true" : "false"}>
                  <span>{check.pass ? "PASS" : "FAIL"}</span>
                  {check.name}
                </li>
              ))}
            </ul>
          </div>
        )}
        {panel && (
          <div className="sf-results">
            <h3>Panel</h3>
            <ul className="sf-result-list">
              {panel.rows.map((row) => (
                <li key={row.id} data-state={row.state}>
                  <div className="sf-result-head">
                    <span className="sf-result-state">{row.state === "OFF" ? "OFF" : row.state}</span>
                    <span>{row.title || row.id}</span>
                  </div>
                  {row.verdict.invalid && <p className="sf-engine-note">{row.verdict.invalid}</p>}
                  <pre>{JSON.stringify(row.verdict.detail ?? {}, null, 2)}</pre>
                </li>
              ))}
            </ul>
            <p className="sf-chain-valid" data-valid={panel.chain_valid ? "true" : "false"}>
              Chain valid: {panel.chain_valid ? "true" : "false"} · entries: {panel.entry_count}
              {panel.tamper
                ? ` · before tamper: ${panel.chain_valid_before_tamper ? "true" : "false"} · after replacing seal ${panel.tamper.seal_replaced}: ${panel.tamper.valid_after ? "true" : "false"}`
                : ""}
            </p>
            <ol className="sf-chain">
              {panel.entries.map((entry) => (
                <li key={entry.seq}>
                  <span>#{entry.seq}</span>
                  <code title={entry.seal}>{entry.seal.slice(0, 16)}…</code>
                  <span className="sf-chain-prev" title={entry.prev}>
                    prev {entry.prev.slice(0, 8)}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}
        {log.length > 0 && (
          <details className="sf-log">
            <summary>Engine log</summary>
            <pre>{log.join("\n")}</pre>
          </details>
        )}
      </div>
      <footer className="sf-panel-foot">
        A template whose toggle is off does not run and does not seal a verdict. The writer never grades its own
        work. {fileMatch ? "Toggles match templates.json." : "Toggles differ from templates.json until you reset."}
      </footer>
    </section>
  );
}
