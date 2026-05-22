import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildServer } from "../index.js";

describe("workspace routes", () => {
  it("returns seeded real workspaces", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "agentpanels-route-"));
    const dataDir = path.join(root, "dashboard", "backend", "data");
    await mkdir(path.join(root, "one-code-cli"), { recursive: true });

    const app = await buildServer({
      config: { repoRoot: root, dataDir },
      occProbe: async () => ({
        path: null,
        version: null,
        doctor: { ok: false, error: "not used" },
      }),
    });

    try {
      const response = await app.inject({ method: "GET", url: "/api/workspaces" });
      const body = response.json();

      expect(response.statusCode).toBe(200);
      expect(body.map((workspace: { name: string }) => workspace.name)).toEqual(["AgentPanels", "one-code-cli"]);
    } finally {
      await app.close();
      await rm(root, { recursive: true, force: true });
    }
  });
});
