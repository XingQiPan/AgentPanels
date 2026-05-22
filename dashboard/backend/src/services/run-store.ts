import { randomUUID } from "node:crypto";
import path from "node:path";
import type { DashboardRun, RunStatus } from "@agentpanels/shared";
import { readJsonFile, writeJsonFile } from "./json-store.js";

export type RunStoreOptions = {
  dataDir: string;
  now?: () => Date;
};

export type ListRunsOptions = RunStoreOptions & {
  workspaceId?: string;
};

export type CreateRunInput = {
  workspaceId: string;
  agent: string;
  title: string;
  prompt: string;
};

export type RunPatch = Partial<
  Pick<
    DashboardRun,
    "occRunId" | "status" | "resultPath" | "stdoutPath" | "stderrPath" | "sessionId" | "error"
  >
>;

type RunStoreFile = {
  runs: DashboardRun[];
};

const RUNS_FILE = "runs.json";

export async function createRun(input: CreateRunInput, options: RunStoreOptions): Promise<DashboardRun> {
  const now = getTimestamp(options);
  const store = await readStore(options);
  const run: DashboardRun = {
    dashboardRunId: `dash_run_${randomUUID()}`,
    occRunId: null,
    workspaceId: input.workspaceId,
    agent: input.agent,
    title: input.title,
    prompt: input.prompt,
    status: "queued",
    createdAt: now,
    updatedAt: now,
    resultPath: null,
    stdoutPath: null,
    stderrPath: null,
    sessionId: null,
    error: null,
  };

  await writeStore(options, { runs: [run, ...store.runs] });
  return run;
}

export async function listRuns(options: ListRunsOptions): Promise<DashboardRun[]> {
  const store = await readStore(options);
  return store.runs.filter((run) => !options.workspaceId || run.workspaceId === options.workspaceId);
}

export async function getRun(id: string, options: RunStoreOptions): Promise<DashboardRun | null> {
  const store = await readStore(options);
  return store.runs.find((run) => run.dashboardRunId === id) ?? null;
}

export async function updateRun(id: string, patch: RunPatch, options: RunStoreOptions): Promise<DashboardRun> {
  const store = await readStore(options);
  const existing = store.runs.find((run) => run.dashboardRunId === id);
  if (!existing) {
    throw new Error(`Run not found: ${id}`);
  }

  const updatedRun: DashboardRun = {
    ...existing,
    ...patch,
    updatedAt: getTimestamp(options),
  };

  await writeStore(options, {
    runs: store.runs.map((run) => (run.dashboardRunId === id ? updatedRun : run)),
  });
  return updatedRun;
}

export async function confirmRun(id: string, options: RunStoreOptions): Promise<DashboardRun> {
  return updateRun(id, { status: "success" }, options);
}

export function statusFromOccSuccess(success: boolean): RunStatus {
  return success ? "confirming" : "failed";
}

async function readStore(options: RunStoreOptions): Promise<RunStoreFile> {
  return readJsonFile(getStorePath(options), { runs: [] });
}

async function writeStore(options: RunStoreOptions, store: RunStoreFile): Promise<void> {
  await writeJsonFile(getStorePath(options), store);
}

function getStorePath(options: RunStoreOptions): string {
  return path.join(options.dataDir, RUNS_FILE);
}

function getTimestamp(options: RunStoreOptions): string {
  return (options.now?.() ?? new Date()).toISOString();
}
