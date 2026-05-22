import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { activateWorkspace, addWorkspace, listWorkspaces } from "./workspace-store.js";

async function makeTempRepo(): Promise<{ root: string; dataDir: string; cleanup: () => Promise<void> }> {
  const root = await mkdtemp(path.join(tmpdir(), "agentpanels-repo-"));
  const dataDir = path.join(root, "dashboard", "backend", "data");
  await mkdir(path.join(root, "one-code-cli"), { recursive: true });

  return {
    root,
    dataDir,
    cleanup: () => rm(root, { recursive: true, force: true }),
  };
}

describe("workspace-store", () => {
  it("seeds AgentPanels and one-code-cli from the repo root", async () => {
    const temp = await makeTempRepo();
    try {
      const workspaces = await listWorkspaces({ repoRoot: temp.root, dataDir: temp.dataDir });

      expect(workspaces).toHaveLength(2);
      expect(workspaces.map((workspace) => workspace.name)).toEqual(["AgentPanels", "one-code-cli"]);
      expect(workspaces[0]?.path).toBe(path.resolve(temp.root));
      expect(workspaces[0]?.active).toBe(true);
      expect(workspaces[1]?.path).toBe(path.join(temp.root, "one-code-cli"));
      expect(workspaces[1]?.active).toBe(false);
    } finally {
      await temp.cleanup();
    }
  });

  it("adds a real workspace and rejects a missing path", async () => {
    const temp = await makeTempRepo();
    const extraWorkspace = path.join(temp.root, "packages", "site");
    await mkdir(extraWorkspace, { recursive: true });

    try {
      const added = await addWorkspace(
        { name: "Site", path: extraWorkspace },
        { repoRoot: temp.root, dataDir: temp.dataDir },
      );
      const workspaces = await listWorkspaces({ repoRoot: temp.root, dataDir: temp.dataDir });

      expect(added.name).toBe("Site");
      expect(workspaces.some((workspace) => workspace.id === added.id)).toBe(true);
      await expect(
        addWorkspace({ name: "Missing", path: path.join(temp.root, "missing") }, { repoRoot: temp.root, dataDir: temp.dataDir }),
      ).rejects.toThrow("Workspace path does not exist");
    } finally {
      await temp.cleanup();
    }
  });

  it("activates only one workspace", async () => {
    const temp = await makeTempRepo();
    try {
      const workspaces = await listWorkspaces({ repoRoot: temp.root, dataDir: temp.dataDir });
      const target = workspaces[1];
      expect(target).toBeDefined();

      await activateWorkspace(target.id, { repoRoot: temp.root, dataDir: temp.dataDir });
      const updated = await listWorkspaces({ repoRoot: temp.root, dataDir: temp.dataDir });

      expect(updated.filter((workspace) => workspace.active)).toHaveLength(1);
      expect(updated.find((workspace) => workspace.id === target.id)?.active).toBe(true);
    } finally {
      await temp.cleanup();
    }
  });
});
