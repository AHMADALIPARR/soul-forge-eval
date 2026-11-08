import demo from "../../data/demo-recording.json";
import type { Agent, Capability, RecEvent, Recording } from "../../lib/engine-types";

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asCapability(value: unknown): Capability | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const cap: Capability = {};
  if (typeof raw.support === "string") cap.support = raw.support;
  if (typeof raw.min === "number") cap.min = raw.min;
  if (typeof raw.max === "number") cap.max = raw.max;
  if (typeof raw.step === "number") cap.step = raw.step;
  if (typeof raw.default === "string" || typeof raw.default === "number") cap.default = raw.default;
  if (typeof raw.restrictions === "string") cap.restrictions = raw.restrictions;
  if (typeof raw.provider === "string") cap.provider = raw.provider;
  if (typeof raw.model === "string") cap.model = raw.model;
  return cap;
}

export function parseRecording(value: unknown): Recording | string {
  if (!value || typeof value !== "object") return "Recording must be a JSON object.";
  const raw = value as Record<string, unknown>;
  if (!Array.isArray(raw.agents) || !Array.isArray(raw.events)) {
    return "Recording needs agents and events arrays.";
  }
  const agents: Agent[] = raw.agents.map((item, index) => {
    const agent = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const id = asString(agent.id, `agent-${index + 1}`);
    return {
      id,
      name: asString(agent.name, id),
      role: asString(agent.role, "Unspecified"),
      provider: asString(agent.provider, "unknown"),
      model: asString(agent.model, "unknown"),
      capability: asCapability(agent.capability),
    };
  });
  const events: RecEvent[] = raw.events.map((item, index) => {
    const event = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const recipient = Array.isArray(event.recipient)
      ? event.recipient.map((part) => asString(part, "unknown"))
      : asString(event.recipient, "unknown");
    return {
      event_id: asString(event.event_id, `event-${index + 1}`),
      sequence: typeof event.sequence === "number" ? event.sequence : index + 1,
      occurred_at: asString(event.occurred_at),
      task_id: asString(event.task_id, "untagged"),
      sender: asString(event.sender, "unknown"),
      recipient,
      kind: asString(event.kind, "message"),
      message: typeof event.message === "string" ? event.message : null,
      status: asString(event.status, "unknown"),
      activity_label: typeof event.activity_label === "string" ? event.activity_label : undefined,
      progress_summary: typeof event.progress_summary === "string" ? event.progress_summary : undefined,
      source: typeof event.source === "string" ? event.source : undefined,
    };
  });
  return { note: asString(raw.note), agents, events };
}

export function demoRecording(): Recording {
  const parsed = parseRecording(demo);
  if (typeof parsed === "string") {
    return { agents: [], events: [] };
  }
  return parsed;
}
