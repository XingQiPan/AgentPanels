import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { OccCommandResult } from "./occ-runner.js";
import { dispatchRun } from "./run-service.js";
import { listWorkspaces } from "./workspace-store.js";

async function makeRepo(): Promise<{ root: string; dataDir: string; cleanup: () => Promise<void> }> {
  const root = await mkdtemp(path.join(tmpdir(), "agentpanels-run-service-"));
  const dataDir = path.join(root, "dashboard", "backend", "data");
  await mkdir(path.join(root, "one-code-cli"), { recursive: true });

  return {
    root,
    dataDir,
    cleanup: () => rm(root, { recursive: true, force: true }),
  };
}

describe("run-service", () => {
  it("dispatches occ run and maps success=true to confirming", async () => {
    const repo = await makeRepo();
    const calls: Array<{ args: string[]; cwd?: string; stdin?: string }> = [];
    try {
      const [workspace] = await listWorkspaces({ repoRoot: repo.root, dataDir: repo.dataDir });
      const run = await dispatchRun(
        {
          workspaceId: workspace.id,
          agent: "codex",
          title: "实现任务",
          prompt: "请实现任务",
        },
        {
          repoRoot: repo.root,
          dataDir: repo.dataDir,
          timeoutMs: 5000,
          runCommand: async (args, options): Promise<OccCommandResult> => {
            calls.push({ args, cwd: options.cwd, stdin: options.stdin });
            return {
              ok: true,
              stdout: JSON.stringify({
                success: true,
                run_id: "run_occ_1",
                session_id: "session_1",
                result_path: path.join(repo.root, ".occ", "runs", "run_occ_1", "result.md"),
              }),
              stderr: "",
              output: "",
              exitCode: 0,
              timedOut: false,
            };
          },
        },
      );

      expect(run.status).toBe("confirming");
      expect(run.occRunId).toBe("run_occ_1");
      expect(run.sessionId).toBe("session_1");
      expect(run.resultPath).toContain("result.md");
      expect(calls[0]).toEqual({
        args: ["run", "--agent", "codex", "--cwd", repo.root, "--stdin", "--non-interactive", "--stream", "--output", "json"],
        cwd: repo.root,
        stdin: "请实现任务",
      });
    } finally {
      await repo.cleanup();
    }
  });

  it("marks the dashboard run failed when occ fails", async () => {
    const repo = await makeRepo();
    try {
      const [workspace] = await listWorkspaces({ repoRoot: repo.root, dataDir: repo.dataDir });
      const run = await dispatchRun(
        {
          workspaceId: workspace.id,
          agent: "codex",
          title: "失败任务",
          prompt: "fail",
        },
        {
          repoRoot: repo.root,
          dataDir: repo.dataDir,
          timeoutMs: 5000,
          runCommand: async (): Promise<OccCommandResult> => ({
            ok: false,
            stdout: "",
            stderr: "boom",
            output: "boom",
            exitCode: 1,
            timedOut: false,
            error: "occ run exited with code 1",
          }),
        },
      );

      expect(run.status).toBe("failed");
      expect(run.error).toContain("occ run exited with code 1");
    } finally {
      await repo.cleanup();
    }
  });
});
