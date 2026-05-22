import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildServer } from "../index.js";
import type { OccCommandResult } from "../services/occ-runner.js";
import { listWorkspaces } from "../services/workspace-store.js";

async function makeRepo(): Promise<{ root: string; dataDir: string; cleanup: () => Promise<void> }> {
  const root = await mkdtemp(path.join(tmpdir(), "agentpanels-runs-route-"));
  const dataDir = path.join(root, "dashboard", "backend", "data");
  await mkdir(path.join(root, "one-code-cli"), { recursive: true });

  return {
    root,
    dataDir,
    cleanup: () => rm(root, { recursive: true, force: true }),
  };
}

describe("run routes", () => {
  it("creates and lists dashboard runs", async () => {
    const repo = await makeRepo();
    const [workspace] = await listWorkspaces({ repoRoot: repo.root, dataDir: repo.dataDir });
    const app = await buildServer({
      config: { repoRoot: repo.root, dataDir: repo.dataDir },
      occProbe: async () => ({ path: null, version: null, doctor: { ok: false, error: "not used" } }),
      runCommand: async (): Promise<OccCommandResult> => ({
        ok: true,
        stdout: JSON.stringify({
          success: true,
          run_id: "run_route_1",
          session_id: "session_route_1",
          result_path: path.join(repo.root, ".occ", "runs", "run_route_1", "result.md"),
        }),
        stderr: "",
        output: "",
        exitCode: 0,
        timedOut: false,
      }),
    });

    try {
      const createResponse = await app.inject({
        method: "POST",
        url: "/api/runs",
        payload: {
          workspaceId: workspace.id,
          agent: "codex",
          title: "路由任务",
          prompt: "请执行",
        },
      });
      const created = createResponse.json();

      expect(createResponse.statusCode).toBe(200);
      expect(created.status).toBe("confirming");
      expect(created.occRunId).toBe("run_route_1");

      const listResponse = await app.inject({ method: "GET", url: `/api/runs?workspaceId=${workspace.id}` });
      const list = listResponse.json();
      expect(list).toHaveLength(1);
      expect(list[0].dashboardRunId).toBe(created.dashboardRunId);
    } finally {
      await app.close();
      await repo.cleanup();
    }
  });
});
