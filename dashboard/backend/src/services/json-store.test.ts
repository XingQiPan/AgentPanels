import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { readJsonFile, writeJsonFile } from "./json-store.js";

describe("json-store", () => {
  it("returns fallback when file is missing", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "agentpanels-store-"));
    try {
      await expect(readJsonFile(path.join(dir, "missing.json"), { items: [] })).resolves.toEqual({ items: [] });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("writes and reads json", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "agentpanels-store-"));
    const file = path.join(dir, "store.json");
    try {
      await writeJsonFile(file, { ok: true });
      await expect(readJsonFile(file, { ok: false })).resolves.toEqual({ ok: true });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
