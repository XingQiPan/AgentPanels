import type { LightweightSkill } from "@agentpanels/shared";
import { runOccListCommand, type OccListRunnerOptions } from "./occ-list-runner.js";

export async function listSkills(options: OccListRunnerOptions): Promise<LightweightSkill[]> {
  const result = await runOccListCommand(["skills", "list"], options);
  if (!result.ok) {
    return [
      {
        name: "occ skills list",
        installed: false,
        raw: result.output || result.error || "occ skills list failed",
      },
    ];
  }

  return parseSkillOutput(result.output);
}

export function parseSkillOutput(output: string): LightweightSkill[] {
  const json = tryParseJson(output);
  if (Array.isArray(json)) {
    return json.map((item) => skillFromUnknown(item)).filter((item): item is LightweightSkill => Boolean(item));
  }

  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(skillFromLine);
}

function skillFromUnknown(item: unknown): LightweightSkill | null {
  if (!item || typeof item !== "object") {
    return null;
  }

  const value = item as Record<string, unknown>;
  const name = String(value.name ?? value.id ?? "").trim();
  if (!name) {
    return null;
  }

  return {
    name,
    installed: value.installed === undefined ? true : Boolean(value.installed),
    raw: JSON.stringify(item),
  };
}

function skillFromLine(line: string): LightweightSkill {
  const name = line.replace(/^[-*\s]+/, "").split(/\s+/)[0] || line;
  return {
    name,
    installed: !/(missing|not installed|未安装|不可用)/i.test(line),
    raw: line,
  };
}

function tryParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
