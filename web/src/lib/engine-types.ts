export type TemplateSpec = {
  id: string;
  title: string;
  kind: string;
  description: string;
  enabled: boolean;
  threshold?: number;
  trials?: number;
  budget_usec_per_case?: number;
};

export type CheckResult = { name: string; pass: boolean };

export type VerdictDetail = Record<string, unknown>;

export type Verdict = {
  template?: string;
  kind?: string;
  passed?: boolean;
  invalid?: string;
  detail?: VerdictDetail;
};

export type VerdictRow = {
  state: string;
  id: string;
  title: string;
  verdict: Verdict;
};

export type ChainEntry = {
  seq: number;
  record: Verdict;
  prev: string;
  seal: string;
};

export type PanelReport = {
  rows: VerdictRow[];
  chain_valid: boolean;
  chain_valid_before_tamper: boolean;
  tamper: { seal_replaced: number; valid_after: boolean } | null;
  entries: ChainEntry[];
  tip: string;
  entry_count: number;
  overall: string;
  overall_line: string;
  tripped: string[];
};

export type EngineReport = {
  error?: string;
  mechanics?: { checks: CheckResult[]; failures: number };
  panel?: PanelReport;
  engine?: string;
  godot?: string;
  loaded_default?: boolean;
};

export type Capability = {
  schema_version?: string;
  provider?: string;
  model?: string;
  support?: string;
  revision?: number;
  min?: number;
  max?: number;
  step?: number;
  default?: string | number;
  restrictions?: string;
};

export type Agent = {
  id: string;
  name: string;
  role: string;
  provider: string;
  model: string;
  capability: Capability | null;
};

export type RecEvent = {
  event_id: string;
  sequence: number;
  occurred_at: string;
  task_id: string;
  sender: string;
  recipient: string | string[];
  kind: string;
  message: string | null;
  status: string;
  activity_label?: string;
  progress_summary?: string;
  source?: string;
};

export type Recording = {
  note?: string;
  agents: Agent[];
  events: RecEvent[];
};
