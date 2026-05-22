import { createHash } from "node:crypto";
import { access } from "node:fs/promises";
import path from "node:path";
import type { DashboardWorkspace } from "@agentpanels/shared";
import { readJsonFile, writeJsonFile } from "./json-store.js";

export type WorkspaceStoreOptions = {
  repoRoot: string;
  dataDir: string;
  now?: () => Date;
};

export type AddWorkspaceInput = {
  name: string;
  path: string;
};

type WorkspaceStoreFile = {
  workspaces: DashboardWorkspace[];
};

const WORKSPACES_FILE = "workspaces.json";

export async function listWorkspaces(options: WorkspaceStoreOptions): Promise<DashboardWorkspace[]> {
  const store = await readStore(options);
  return store.workspaces;
}

export async function addWorkspace(
  input: AddWorkspaceInput,
  options: WorkspaceStoreOptions,
): Promise<DashboardWorkspace> {
  const workspacePath = normalizeWorkspacePath(input.path);
  await assertPathExists(workspacePath);

  const now = getTimestamp(options);
  const store = await readStore(options);
  const existing = store.workspaces.find((workspace) => normalizeWorkspacePath(workspace.path) === workspacePath);
  if (existing) {
    return existing;
  }

  const workspace: DashboardWorkspace = {
    id: createWorkspaceId(workspacePath),
    name: input.name.trim() || path.basename(workspacePath),
    path: workspacePath,
    active: store.workspaces.length === 0,
    runningCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  const updated = { workspaces: [...store.workspaces, workspace] };
  await writeStore(options, updated);
  return workspace;
}

export async function activateWorkspace(
  id: string,
  options: WorkspaceStoreOptions,
): Promise<DashboardWorkspace> {
  const store = await readStore(options);
  const target = store.workspaces.find((workspace) => workspace.id === id);
  if (!target) {
    throw new Error(`Workspace not found: ${id}`);
  }

  const now = getTimestamp(options);
  const updated = {
    workspaces: store.workspaces.map((workspace) => ({
      ...workspace,
      active: workspace.id === id,
      updatedAt: workspace.id === id ? now : workspace.updatedAt,
    })),
  };

  await writeStore(options, updated);
  return updated.workspaces.find((workspace) => workspace.id === id)!;
}

async function readStore(options: WorkspaceStoreOptions): Promise<WorkspaceStoreFile> {
  const fallback = await createSeedStore(options);
  const storePath = getStorePath(options);
  const storeExists = await pathExists(storePath);
  const store = await readJsonFile(storePath, fallback);

  if (!storeExists || store.workspaces.length === 0) {
    await writeStore(options, fallback);
    return fallback;
  }

  return store;
}

async function createSeedStore(options: WorkspaceStoreOptions): Promise<WorkspaceStoreFile> {
  const now = getTimestamp(options);
  const repoRoot = normalizeWorkspacePath(options.repoRoot);
  const seeds: DashboardWorkspace[] = [
    {
      id: createWorkspaceId(repoRoot),
      name: "AgentPanels",
      path: repoRoot,
      active: true,
      runningCount: 0,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const oneCodeCliPath = path.join(repoRoot, "one-code-cli");
  if (await pathExists(oneCodeCliPath)) {
    seeds.push({
      id: createWorkspaceId(oneCodeCliPath),
      name: "one-code-cli",
      path: oneCodeCliPath,
      active: false,
      runningCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  }

  return { workspaces: seeds };
}

async function writeStore(options: WorkspaceStoreOptions, store: WorkspaceStoreFile): Promise<void> {
  await writeJsonFile(getStorePath(options), store);
}

function getStorePath(options: WorkspaceStoreOptions): string {
  return path.join(options.dataDir, WORKSPACES_FILE);
}

function createWorkspaceId(workspacePath: string): string {
  return createHash("sha1").update(normalizeWorkspacePath(workspacePath).toLowerCase()).digest("hex").slice(0, 12);
}

function normalizeWorkspacePath(workspacePath: string): string {
  return path.resolve(workspacePath);
}

function getTimestamp(options: WorkspaceStoreOptions): string {
  return (options.now?.() ?? new Date()).toISOString();
}

async function assertPathExists(workspacePath: string): Promise<void> {
  if (!(await pathExists(workspacePath))) {
    throw new Error(`Workspace path does not exist: ${workspacePath}`);
  }
}

async function pathExists(candidate: string): Promise<boolean> {
  try {
    await access(candidate);
    return true;
  } catch {
    return false;
  }
}
