import { describe, expect, it } from "vitest";
import { hiddenFutureNavItems, visibleNavItems } from "./nav-items";

describe("navigation scope", () => {
  it("only renders backend-backed core navigation entries", () => {
    expect(visibleNavItems.map((item) => item.label)).toEqual(["总览", "工作区", "会话", "运行记录"]);
  });

  it("keeps overbuilt future entries hidden instead of rendered", () => {
    expect(hiddenFutureNavItems).toEqual(["Agents", "Skills", "Agent 开发", "设置"]);
  });
});
