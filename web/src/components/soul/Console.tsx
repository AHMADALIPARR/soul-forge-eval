import { useMemo, useRef, useState } from "react";
import type { Agent, Capability, RecEvent, Recording } from "../../lib/engine-types";
import { AgentBlob } from "./Blob";
import { demoRecording, parseRecording } from "./recording";

const STATUS_TEXT: Record<string, string> = {
  queued: "Queued",
  sent: "Sent",
  delivered: "Delivered",
  failed: "Failed",
  working: "Working",
  waiting: "Waiting",
  complete: "Complete",
  unknown: "Unknown",
};

function formatTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "unknown time";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Los_Angeles",
    timeZoneName: "short",
  }).format(date);
}

function activityOf(agentId: string, events: RecEvent[]) {
  let label: string | null = null;
  for (const event of events) {
    if (event.sender === agentId && event.kind === "activity" && event.activity_label) {
      label = event.activity_label;
    }
  }
  return label;
}

function titleCase(value: string) {
  return value ? value[0].toUpperCase() + value.slice(1) : "Unknown";
}

function onStep(value: number, cap: Capability) {
  if (cap.min == null || cap.max == null || cap.step == null || cap.step <= 0) return false;
  if (value < cap.min - 1e-9 || value > cap.max + 1e-9) return false;
  const steps = (value - cap.min) / cap.step;
  return Math.abs(steps - Math.round(steps)) < 1e-6;
}

export function Console() {
  const [recording, setRecording] = useState<Recording>(() => demoRecording());
  const [source, setSource] = useState<"demo" | "imported" | "empty">("demo");
  const [selectedId, setSelectedId] = useState<string>(() => demoRecording().agents[0]?.id ?? "");
  const [rosterOpen, setRosterOpen] = useState(false);
  const [agentFilter, setAgentFilter] = useState("");
  const [taskFilter, setTaskFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [importError, setImportError] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<"agent" | "evaluation" | "worker">("agent");
  const fileRef = useRef<HTMLInputElement>(null);

  const agents = recording.agents;
  const events = useMemo(
    () => [...recording.events].sort((a, b) => a.sequence - b.sequence),
    [recording.events],
  );
  const selected = agents.find((agent) => agent.id === selectedId) ?? agents[0];
  const nameOf = (id: string) => agents.find((agent) => agent.id === id)?.name ?? id;
  const recipientText = (recipient: string | string[]) =>
    recipient === "broadcast" ? "everyone" : [recipient].flat().map(nameOf).join(", ");

  const tasks = [...new Set(events.map((event) => event.task_id))];
  const statuses = [...new Set(events.map((event) => event.status))];
  const visible = events.filter((event) => {
    if (agentFilter) {
      const recipients = [event.recipient].flat();
      const involved =
        event.sender === agentFilter || recipients.includes(agentFilter) || event.recipient === "broadcast";
      if (!involved) return false;
    }
    if (taskFilter && event.task_id !== taskFilter) return false;
    if (statusFilter && event.status !== statusFilter) return false;
    return true;
  });

  function loadDemo() {
    const next = demoRecording();
    setRecording(next);
    setSource("demo");
    setSelectedId(next.agents[0]?.id ?? "");
    setImportError("");
    setAgentFilter("");
    setTaskFilter("");
    setStatusFilter("");
    setDrafts({});
    setTab("agent");
  }

  function clearRecording() {
    setRecording({ agents: [], events: [] });
    setSource("empty");
    setSelectedId("");
    setRosterOpen(false);
    setImportError("");
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    try {
      const parsed = parseRecording(JSON.parse(await file.text()));
      if (typeof parsed === "string") {
        setImportError(parsed);
        return;
      }
      setRecording(parsed);
      setSource("imported");
      setSelectedId(parsed.agents[0]?.id ?? "");
      setImportError("");
      setAgentFilter("");
      setTaskFilter("");
      setStatusFilter("");
      setDrafts({});
    } catch {
      setImportError("That file is not JSON.");
    }
  }

  const sourceLabel =
    source === "demo" ? "Demo sample" : source === "imported" ? "Imported recording" : "Nothing loaded";

  return (
    <div className="sf-app">
      {source === "demo" && (
        <div className="sf-demo-banner" role="note">
          DEMO: sample data only. This transcript is not a live exchange, and no model receives it.
        </div>
      )}
      <header className="sf-header">
        <div className="sf-brand">
          <AgentBlob id="soul-forge" size={32} />
          <div>
            <p className="sf-kicker">SnapKitty Research Lab</p>
            <h1>Soul Forge</h1>
          </div>
        </div>
        <div className="sf-status" role="status">
          <span className="sf-dot" data-state="disconnected" aria-hidden="true" />
          <span>Message bus: Disconnected</span>
          <span className="sf-chip">Showing: {sourceLabel}</span>
        </div>
        <div className="sf-header-actions">
          <button type="button" className="sf-btn sf-only-narrow" onClick={() => setRosterOpen(true)}>
            Agents
          </button>
        </div>
      </header>

      <div className="sf-layout">
        {rosterOpen && (
          <button type="button" className="sf-scrim" aria-label="Close agents" onClick={() => setRosterOpen(false)} />
        )}
        <aside className={rosterOpen ? "sf-roster sf-open" : "sf-roster"} aria-label="Agents">
          <div className="sf-roster-head">
            <h2>Agents</h2>
            <button type="button" className="sf-btn sf-only-narrow" onClick={() => setRosterOpen(false)}>
              Close
            </button>
          </div>
          {agents.length === 0 ? (
            <p className="sf-help">No agents in this view.</p>
          ) : (
            <ul>
              {agents.map((agent) => {
                const activity = activityOf(agent.id, events);
                const label = activity || "unknown";
                return (
                  <li key={agent.id}>
                    <button
                      type="button"
                      className="sf-agent"
                      aria-current={selected?.id === agent.id ? "true" : undefined}
                      onClick={() => {
                        setSelectedId(agent.id);
                        setTab("agent");
                        setRosterOpen(false);
                      }}
                    >
                      <AgentBlob id={agent.id} activity={label} />
                      <span className="sf-agent-text">
                        <span className="sf-agent-name">{agent.name}</span>
                        <span className="sf-agent-model">{agent.model}</span>
                        <span className="sf-pill" data-activity={label}>
                          {titleCase(label)}
                          {activity ? " (recorded)" : ""}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        <main className="sf-thread" aria-label="Conversation">
          <div className="sf-thread-tools">
            <button type="button" className="sf-btn" onClick={() => fileRef.current?.click()}>
              Import recording
            </button>
            <input
              ref={fileRef}
              className="sf-visually-hidden"
              type="file"
              accept="application/json,.json"
              aria-hidden="true"
              tabIndex={-1}
              onChange={(event) => {
                void onFile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            <button type="button" className="sf-btn" onClick={loadDemo} disabled={source === "demo"}>
              Load demo sample
            </button>
            <button type="button" className="sf-btn" onClick={clearRecording} disabled={source === "empty"}>
              Clear view
            </button>
          </div>
          {importError && (
            <p className="sf-error-text" role="alert">
              {importError}
            </p>
          )}
          <p className="sf-help">
            The message bus has no endpoint, so this view only reads a recording. Import replaces the sample.
            Markup in a recording stays text.
          </p>
          <div className="sf-filters" role="group" aria-label="Filters">
            <label>
              Agent
              <select value={agentFilter} onChange={(event) => setAgentFilter(event.target.value)}>
                <option value="">All</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Task
              <select value={taskFilter} onChange={(event) => setTaskFilter(event.target.value)}>
                <option value="">All</option>
                {tasks.map((task) => (
                  <option key={task} value={task}>
                    {task}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Status
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="">All</option>
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_TEXT[status] || status}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {visible.length === 0 ? (
            <div className="sf-empty">
              <h2>{source === "empty" ? "No recording loaded" : "Nothing matches"}</h2>
              <p className="sf-help">
                {source === "empty"
                  ? "Load the demo sample or import a recording JSON."
                  : "Clear a filter to see the rest of this recording."}
              </p>
            </div>
          ) : (
            <ol className="sf-messages">
              {visible.map((event) => (
                <EventRow
                  key={event.event_id}
                  event={event}
                  mine={Boolean(selected && event.sender === selected.id)}
                  nameOf={nameOf}
                  recipientText={recipientText(event.recipient)}
                  sourceLabel={sourceLabel}
                />
              ))}
            </ol>
          )}
        </main>

        <aside className="sf-inspector" aria-label="Agent detail">
          <div className="sf-segmented" role="tablist" aria-label="Inspector">
            {(
              [
                ["agent", "Agent"],
                ["evaluation", "Evaluation"],
                ["worker", "Worker"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>
          {!selected ? (
            <p className="sf-help">Select an agent to inspect their seat.</p>
          ) : tab === "worker" ? (
            <WorkerCard agent={selected} />
          ) : tab === "evaluation" ? (
            <EvaluationCard agent={selected} events={events} />
          ) : (
            <AgentCard
              agent={selected}
              draft={drafts[selected.id] ?? ""}
              onDraft={(value) => setDrafts((current) => ({ ...current, [selected.id]: value }))}
            />
          )}
        </aside>
      </div>
    </div>
  );
}

function EventRow({
  event,
  mine,
  nameOf,
  recipientText,
  sourceLabel,
}: {
  event: RecEvent;
  mine: boolean;
  nameOf: (id: string) => string;
  recipientText: string;
  sourceLabel: string;
}) {
  if (event.kind === "activity") {
    const label = event.activity_label || "unknown";
    return (
      <li className="sf-activity-row">
        <AgentBlob id={event.sender} activity={label} size={24} />
        <span className="sf-pill" data-activity={label}>
          {titleCase(label)}
        </span>
        <span className="sf-help">
          {nameOf(event.sender)} · {event.task_id} · {formatTime(event.occurred_at)}
        </span>
        {event.progress_summary && (
          <details className="sf-progress">
            <summary>Progress summary</summary>
            <p>{event.progress_summary}</p>
          </details>
        )}
      </li>
    );
  }
  return (
    <li className={mine ? "sf-msg sf-msg-mine" : "sf-msg"} data-status={event.status}>
      <div className="sf-msg-body">
        <div className="sf-msg-head">
          <strong>{nameOf(event.sender)}</strong>
          <span className="sf-help">to {recipientText}</span>
          <AgentBlob id={event.sender} size={24} />
        </div>
        <div className="sf-bubble">{event.message}</div>
        <div className="sf-meta">
          <span className="sf-chip">{event.task_id}</span>
          <span>{formatTime(event.occurred_at)}</span>
          <span className="sf-delivery" data-status={event.status}>
            {STATUS_TEXT[event.status] || event.status}
          </span>
          <span className="sf-chip sf-chip-source">{sourceLabel}</span>
        </div>
      </div>
    </li>
  );
}

function AgentCard({
  agent,
  draft,
  onDraft,
}: {
  agent: Agent;
  draft: string;
  onDraft: (value: string) => void;
}) {
  const cap = agent.capability;
  const supported = cap?.support === "supported" && cap.min != null && cap.max != null && cap.step != null;
  const numeric = draft.trim() === "" ? null : Number(draft);
  const invalid = supported && numeric != null && (!Number.isFinite(numeric) || !onStep(numeric, cap));
  return (
    <div>
      <div className="sf-agent-card">
        <AgentBlob id={agent.id} size={44} activity={supported ? "idle" : "unknown"} />
        <div>
          <div className="sf-agent-name">{agent.name}</div>
          <div className="sf-help">
            {agent.role} · {agent.provider} / {agent.model}
          </div>
        </div>
      </div>
      {!cap ? (
        <p className="sf-help">No capability card. Temperature cannot be drafted for this seat.</p>
      ) : (
        <div className="sf-temp" role="group" aria-label="Temperature">
          <div className="sf-temp-head">
            <span className="sf-label">Temperature</span>
            <span className="sf-cap-pill" data-support={cap.support ?? "unknown"}>
              {cap.support === "supported" ? "Supported" : cap.support === "unsupported" ? "Unsupported" : "Unknown"}
            </span>
          </div>
          {supported ? (
            <p className="sf-help">
              {agent.provider} / {agent.model} accepts {cap.min}–{cap.max} in steps of {cap.step}. Default:{" "}
              {String(cap.default ?? "provider default")}.
            </p>
          ) : (
            <p className="sf-help">{cap.restrictions || "This model does not accept a temperature."}</p>
          )}
          <div className="sf-temp-inputs">
            <input
              type="range"
              disabled={!supported}
              min={cap.min ?? 0}
              max={cap.max ?? 1}
              step={cap.step ?? 0.1}
              value={supported && numeric != null && !invalid ? numeric : ((cap.min ?? 0) + (cap.max ?? 1)) / 2}
              aria-label="Temperature slider"
              onChange={(event) => onDraft(event.target.value)}
            />
            <input
              type="text"
              className="sf-num"
              disabled={!supported}
              inputMode="decimal"
              placeholder="draft"
              aria-label="Temperature draft"
              aria-invalid={invalid || undefined}
              value={draft}
              onChange={(event) => onDraft(event.target.value)}
            />
          </div>
          {invalid && <p className="sf-error-text">Draft is outside the capability range or step.</p>}
          <dl className="sf-temp-state">
            <div>
              <dt>Requested (draft)</dt>
              <dd>{draft.trim() === "" ? "—" : draft}</dd>
            </div>
            <div>
              <dt>Pending</dt>
              <dd>—</dd>
            </div>
            <div>
              <dt>Effective</dt>
              <dd>not_applied</dd>
            </div>
          </dl>
          <div className="sf-row">
            <button type="button" className="sf-btn sf-btn-primary" disabled>
              Apply
            </button>
            <button type="button" className="sf-btn" disabled={!supported || draft === ""} onClick={() => onDraft("")}>
              Reset draft
            </button>
          </div>
          <p className="sf-help">
            Apply needs a model runtime to acknowledge the change. None is connected, so the effective value stays
            not_applied. The draft is not sent anywhere.
          </p>
        </div>
      )}
    </div>
  );
}

function EvaluationCard({ agent, events }: { agent: Agent; events: RecEvent[] }) {
  const sent = events.filter((event) => event.sender === agent.id && event.kind === "message").length;
  return (
    <div>
      <div className="sf-agent-card">
        <AgentBlob id={agent.id} size={44} />
        <div>
          <div className="sf-agent-name">{agent.name}</div>
          <div className="sf-help">{agent.role}</div>
        </div>
      </div>
      <p className="sf-help">
        This seat does not grade. {sent} recorded message{sent === 1 ? "" : "s"} in the current view. The GDScript
        panel below is the only grader, and the demo writer inside it never sees these messages.
      </p>
    </div>
  );
}

function WorkerCard({ agent }: { agent: Agent }) {
  return (
    <div>
      <div className="sf-agent-card">
        <AgentBlob id={agent.id} size={44} />
        <div>
          <div className="sf-agent-name">{agent.name}</div>
          <div className="sf-help">Worker card</div>
        </div>
      </div>
      <dl className="sf-kv">
        <div>
          <dt>Provider</dt>
          <dd>{agent.provider}</dd>
        </div>
        <div>
          <dt>Model</dt>
          <dd>{agent.model}</dd>
        </div>
        <div>
          <dt>Role</dt>
          <dd>{agent.role}</dd>
        </div>
        <div>
          <dt>Capability</dt>
          <dd>{agent.capability?.support ?? "none"}</dd>
        </div>
      </dl>
    </div>
  );
}
