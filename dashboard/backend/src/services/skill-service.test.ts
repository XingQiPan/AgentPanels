import { describe, expect, it } from "vitest";
import { parseSkillOutput } from "./skill-service.js";

describe("skill-service", () => {
  it("parses plain occ skill output and preserves raw lines", () => {
    expect(parseSkillOutput("- using-one-code-cli installed\n- docs-writer missing")).toEqual([
      { name: "using-one-code-cli", installed: true, raw: "- using-one-code-cli installed" },
      { name: "docs-writer", installed: false, raw: "- docs-writer missing" },
    ]);
  });
});
