export type OccDoctorHealth = {
  ok: boolean;
  output?: string;
  error?: string;
};

export type OccHealth = {
  path: string | null;
  version: string | null;
  versionError?: string;
  doctor: OccDoctorHealth;
};

export type HealthResponse = {
  ok: boolean;
  service: "agentpanels-backend";
  timestamp: string;
  occ: OccHealth;
};

export type ApiErrorResponse = {
  ok: false;
  error: {
    code: string;
    message: string;
    source: "backend" | "occ" | "filesystem";
    details?: unknown;
  };
};

export type DashboardWorkspace = {
  id: string;
  name: string;
  path: string;
  active: boolean;
  runningCount: number;
  createdAt: string;
  updatedAt: string;
};

export type RunStatus = "queued" | "running" | "confirming" | "success" | "failed";

export type DashboardRun = {
  dashboardRunId: string;
  occRunId: string | null;
  workspaceId: string;
  agent: string;
  title: string;
  prompt: string;
  status: RunStatus;
  createdAt: string;
  updatedAt: string;
  resultPath: string | null;
  stdoutPath: string | null;
  stderrPath: string | null;
  sessionId: string | null;
  error: string | null;
};

export type SessionSource = "occ" | "codex" | "claude" | "gemini" | "opencode";

export type SessionIndexItem = {
  id: string;
  source: SessionSource;
  workspaceId: string | null;
  workspacePath: string | null;
  agent: string | null;
  title: string;
  updatedAt: string;
  lastRunId: string | null;
  resultPath: string | null;
};

export type LightweightAgent = {
  name: string;
  cli: string;
  available: boolean;
  raw: string;
};

export type LightweightSkill = {
  name: string;
  installed: boolean;
  raw: string;
};
