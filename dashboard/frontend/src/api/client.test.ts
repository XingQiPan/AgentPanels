import { afterEach, describe, expect, it, vi } from "vitest";
import { getWorkspaces } from "./client";

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
