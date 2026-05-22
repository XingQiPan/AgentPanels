import { afterEach, describe, expect, it, vi } from "vitest";
import { createRun, getRuns, getWorkspaces } from "./client";

describe("getWorkspaces", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns an empty list when the backend endpoint is not ready yet", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("not found", { status: 404 })),
    );

    await expect(getWorkspaces()).resolves.toEqual([]);
  });

  it("returns real workspace data from the backend", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify([
              {
                id: "workspace-1",
                name: "AgentPanels",
                path: "E:/Codes/AgentPanels",
                active: true,
                runningCount: 0,
              },
            ]),
            { status: 200, headers: { "content-type": "application/json" } },
          ),
      ),
    );

    await expect(getWorkspaces()).resolves.toEqual([
      {
        id: "workspace-1",
        name: "AgentPanels",
        path: "E:/Codes/AgentPanels",
        active: true,
        runningCount: 0,
      },
    ]);
  });
});

describe("runs api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches real dashboard runs", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify([
              {
                dashboardRunId: "dash_run_1",
                occRunId: "run_1",
                workspaceId: "workspace-1",
                agent: "codex",
                title: "任务",
                prompt: "prompt",
                status: "confirming",
                createdAt: "2026-05-22T10:00:00.000Z",
                updatedAt: "2026-05-22T10:00:00.000Z",
                resultPath: "result.md",
                stdoutPath: null,
                stderrPath: null,
                sessionId: "session-1",
                error: null,
              },
            ]),
            { status: 200, headers: { "content-type": "application/json" } },
          ),
      ),
    );

    await expect(getRuns("workspace-1")).resolves.toHaveLength(1);
  });

  it("posts a new dashboard run", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            dashboardRunId: "dash_run_1",
            occRunId: null,
            workspaceId: "workspace-1",
            agent: "codex",
            title: "任务",
            prompt: "prompt",
            status: "queued",
            createdAt: "2026-05-22T10:00:00.000Z",
            updatedAt: "2026-05-22T10:00:00.000Z",
            resultPath: null,
            stdoutPath: null,
            stderrPath: null,
            sessionId: null,
            error: null,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await createRun({ workspaceId: "workspace-1", agent: "codex", title: "任务", prompt: "prompt" });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/runs",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ workspaceId: "workspace-1", agent: "codex", title: "任务", prompt: "prompt" }),
      }),
    );
  });
});
