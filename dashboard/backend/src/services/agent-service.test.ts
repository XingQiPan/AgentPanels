import { describe, expect, it } from "vitest";
import { parseAgentOutput } from "./agent-service.js";

describe("agent-service", () => {
  it("parses plain occ agent output and preserves raw lines", () => {
    expect(parseAgentOutput("- codex available\n- claude unavailable")).toEqual([
      { name: "codex", cli: "codex", available: true, raw: "- codex available" },
      { name: "claude", cli: "claude", available: false, raw: "- claude unavailable" },
    ]);
  });
});
