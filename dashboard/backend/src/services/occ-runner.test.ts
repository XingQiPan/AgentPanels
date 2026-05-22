import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { findOccExecutable, probeOcc, runOcc } from "./occ-runner.js";

describe("occ-runner", () => {
  it("prefers OCC_PATH when provided", async () => {
    const occPath = path.resolve("tools", "occ");
    const result = await findOccExecutable({
      env: { OCC_PATH: occPath },
      fileExists: async () => true,
      repoRoot: path.resolve("repo"),
    });

    expect(result).toEqual({
      path: occPath,
      source: "env",
    });
  });

  it("falls back to repo candidates before PATH", async () => {
    const checked: string[] = [];
    const repoRoot = path.resolve("repo");
    const expectedOccPath = path.join(repoRoot, "one-code-cli", "npm", "bin", "occ.js");
    const firstRepoCandidate = path.join(repoRoot, "one-code-cli", "target", "debug", "occ.exe");
    const result = await findOccExecutable({
      env: {},
      fileExists: async (candidate) => {
        checked.push(candidate);
        return path.normalize(candidate) === expectedOccPath;
      },
      repoRoot,
    });

    expect(result).not.toBeNull();
    if (!result) {
      throw new Error("expected repo occ candidate");
    }
    expect(result.path).toBe(expectedOccPath);
    expect(result.source).toBe("repo");
    expect(checked).toContain(firstRepoCandidate);
  });

  it("uses PATH lookup after repo candidates are missing", async () => {
    const pathOcc = path.resolve("tools", process.platform === "win32" ? "occ.cmd" : "occ");
    const result = await findOccExecutable({
      env: { PATH: path.dirname(pathOcc) },
      fileExists: async () => false,
      findOnPath: async () => pathOcc,
      repoRoot: path.resolve("repo"),
    });

    expect(result).toEqual({
      path: pathOcc,
      source: "path",
    });
  });

  it("supports POSIX-style PATH fallback results from the PATH finder", async () => {
    const result = await findOccExecutable({
      env: { PATH: "/usr/local/bin:/usr/bin" },
      fileExists: async () => false,
      findOnPath: async (command, envPath) => {
        expect(command).toBe("occ");
        expect(envPath).toBe("/usr/local/bin:/usr/bin");
        return "/usr/local/bin/occ";
      },
      repoRoot: path.resolve("repo"),
    });

    expect(result).toEqual({
      path: "/usr/local/bin/occ",
      source: "path",
    });
  });

  it("returns timed out command failures without throwing", async () => {
    const result = await runOcc(process.execPath, ["-e", "setTimeout(() => {}, 5000)"], {
      timeoutMs: 50,
    });

    expect(result.ok).toBe(false);
    expect(result.timedOut).toBe(true);
    expect(result.error).toContain("timed out");
  });

  it("runs Windows cmd and bat executables with escaped arguments", async () => {
    if (process.platform !== "win32") {
      return;
    }

    const tempDir = await mkdtemp(path.join(os.tmpdir(), "agentpanels-occ-script-"));
    const scriptBody = [
      "@echo off",
      "if \"%~1\"==\"--version\" (",
      "  echo script:%~2",
      "  exit /b 0",
      ")",
      "echo unexpected:%*",
      "exit /b 2",
    ].join("\r\n");

    for (const extension of [".cmd", ".bat"]) {
      const fakeOccPath = path.join(tempDir, `fake-occ${extension}`);
      await writeFile(fakeOccPath, scriptBody, "utf8");

      const result = await runOcc(fakeOccPath, ["--version", "hello world & safe"], {
        timeoutMs: 1000,
      });

      expect(result.ok).toBe(true);
      expect(result.output).toBe("script:hello world & safe");
    }
  });

  it("preserves version errors when the version probe fails", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "agentpanels-occ-"));
    const fakeOccPath = path.join(tempDir, "fake-occ.js");
    await writeFile(
      fakeOccPath,
      [
        "const arg = process.argv[2];",
        "if (arg === '--version') { console.error('version unavailable'); process.exit(9); }",
        "if (arg === 'doctor') { console.log('doctor ok'); process.exit(0); }",
        "process.exit(1);",
      ].join("\n"),
      "utf8",
    );

    const result = await probeOcc({
      env: { OCC_PATH: fakeOccPath },
      repoRoot: tempDir,
      timeoutMs: 1000,
    });

    expect(result.path).toBe(fakeOccPath);
    expect(result.version).toBeNull();
    expect(result.versionError).toContain("exited with code 9");
    expect(result.doctor.ok).toBe(true);
    expect(result.doctor.output).toBe("doctor ok");
  });
});
