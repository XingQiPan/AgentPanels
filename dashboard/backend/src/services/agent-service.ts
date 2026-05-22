import type { LightweightAgent } from "@agentpanels/shared";
import { runOccListCommand, type OccListRunnerOptions } from "./occ-list-runner.js";

export async function listAgents(options: OccListRunnerOptions): Promise<LightweightAgent[]> {
  const result = await runOccListCommand(["agents", "list"], options);
  if (!result.ok) {
    return [
      {
        name: "occ agents list",
        cli: "occ",
        available: false,
        raw: result.output || result.error || "occ agents list failed",
      },
    ];
  }

  return parseAgentOutput(result.output);
}

export function parseAgentOutput(output: string): LightweightAgent[] {
  const json = tryParseJson(output);
  if (Array.isArray(json)) {
    return json.map((item) => agentFromUnknown(item)).filter((item): item is LightweightAgent => Boolean(item));
  }

  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !isAgentTableHeader(line))
    .map(agentFromLine);
}

function agentFromUnknown(item: unknown): LightweightAgent | null {
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
    cli: String(value.cli ?? value.provider ?? detectCli(name)).trim(),
    available: value.available === undefined ? true : Boolean(value.available),
    raw: JSON.stringify(item),
  };
}

function agentFromLine(line: string): LightweightAgent {
  const name = cleanLeadingMarker(line).split(/\s+/)[0] || line;
  return {
    name,
    cli: detectCli(line),
    available: !/(unavailable|disabled|missing|不可用|未安装)/i.test(line),
    raw: line,
  };
}

function detectCli(value: string): string {
  const match = value.match(/\b(codex|claude|gemini|opencode)\b/i);
  return match?.[1]?.toLowerCase() ?? "unknown";
}

function cleanLeadingMarker(value: string): string {
  return value.replace(/^[-*\s]+/, "");
}

function isAgentTableHeader(line: string): boolean {
  return /^AGENT\s+CLI\s+MODEL\s+EFFORT\s+ENV\s+SOURCE\s+ALIASES$/i.test(line);
}

function tryParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
