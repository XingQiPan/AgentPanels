import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { confirmRun, createRun, getRun, listRuns, updateRun } from "./run-store.js";

async function makeStore(): Promise<{ dataDir: string; cleanup: () => Promise<void> }> {
  const root = await mkdtemp(path.join(tmpdir(), "agentpanels-runs-"));
  const dataDir = path.join(root, "data");
  await mkdir(dataDir, { recursive: true });

  return {
    dataDir,
    cleanup: () => rm(root, { recursive: true, force: true }),
  };
}

describe("run-store", () => {
  it("creates a queued dashboard run before occ starts", async () => {
    const store = await makeStore();
    try {
      const run = await createRun(
        {
          workspaceId: "workspace-1",
          agent: "codex",
          title: "实现任务",
          prompt: "请实现任务",
        },
        { dataDir: store.dataDir, now: () => new Date("2026-05-22T10:00:00.000Z") },
      );

      expect(run.dashboardRunId).toMatch(/^dash_run_/);
      expect(run.occRunId).toBeNull();
      expect(run.status).toBe("queued");
      expect(run.createdAt).toBe("2026-05-22T10:00:00.000Z");
      await expect(getRun(run.dashboardRunId, { dataDir: store.dataDir })).resolves.toEqual(run);
    } finally {
      await store.cleanup();
    }
  });

  it("updates run status and filters by workspace", async () => {
    const store = await makeStore();
    try {
      const first = await createRun(
        { workspaceId: "workspace-1", agent: "codex", title: "任务一", prompt: "one" },
        { dataDir: store.dataDir },
      );
      await createRun(
        { workspaceId: "workspace-2", agent: "claude", title: "任务二", prompt: "two" },
        { dataDir: store.dataDir },
      );

      await updateRun(first.dashboardRunId, { status: "running" }, { dataDir: store.dataDir });
      const runs = await listRuns({ dataDir: store.dataDir, workspaceId: "workspace-1" });

      expect(runs).toHaveLength(1);
      expect(runs[0]?.status).toBe("running");
    } finally {
      await store.cleanup();
    }
  });

  it("confirms a run by moving it to success", async () => {
    const store = await makeStore();
    try {
      const run = await createRun(
        { workspaceId: "workspace-1", agent: "codex", title: "任务", prompt: "prompt" },
        { dataDir: store.dataDir },
      );
      await updateRun(run.dashboardRunId, { status: "confirming" }, { dataDir: store.dataDir });

      const confirmed = await confirmRun(run.dashboardRunId, { dataDir: store.dataDir });

      expect(confirmed.status).toBe("success");
    } finally {
      await store.cleanup();
    }
  });
});
