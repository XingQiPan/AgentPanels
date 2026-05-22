import { access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export async function fileExists(candidate: string): Promise<boolean> {
  try {
    await access(candidate);
    return true;
  } catch {
    return false;
  }
}

export function getDefaultRepoRoot(): string {
  const currentFile = fileURLToPath(import.meta.url);
  return path.resolve(path.dirname(currentFile), "../../../..");
}

export function getPathEntries(envPath: string | undefined): string[] {
  return (envPath ?? "")
    .split(path.delimiter)
    .map((entry) => entry.trim())
    .filter(Boolean);
}
