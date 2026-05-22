# Agent Dashboard Backend-First Scope Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 AgentPanels 收敛成 `one-code-cli` 的可视化调度面板，先完成真实后端能力：工作区、任务分派、运行记录、会话索引和结果入口；复杂 UI、Agent Builder、Skills 管理先隐藏。

**Architecture:** 前端只保留最小调度 UI，通过 HTTP/SSE 调后端。后端是唯一操作层，优先调用 `occ`；如需要读取 Codex/Claude/Gemini/opencode 会话，先通过 `occ` 增加统一 session 聚合能力，短期可只读取 `occ` 已知产物和会话索引。

**Tech Stack:** React + Vite + TypeScript, Fastify + TypeScript, JSON file store, SSE, Rust `one-code-cli/occ`.

---

## 0. Product Scope Reset

### 新定位

`AgentPanels` 不是新的 AI IDE，也不是新的聊天工具。

它只做三件事：

1. **调度**：输入任务，选择工作区、Agent、Skill/预设，然后调用 `occ run`。
2. **队列**：展示待分派、执行中、待确认、已完成、失败。
3. **索引**：统一查看 run、结果文件、日志入口、CLI session 入口。

### 先隐藏的入口

这些 UI 不是删除，是先隐藏，等后端能力完成后再打开：

- `Agent 开发`
- `设置`
- 完整 `Skills` 管理页
- 复杂 `Agents` 管理页
- 复杂文件树
- 类 Codex/Claude Code 的完整聊天界面
- 全局多工作区大屏
- 插件、审计、权限、daemon、桌面打包

### 保留的入口

第一版只保留：

- `总览`：调度队列和任务输入。
- `工作区`：真实工作区列表，不再是假数据。
- `会话`：统一 session/run 索引，只读查看。
- `运行记录`：run 历史、结果、日志入口。

### UI 原则

- 如果只是隐藏入口或把静态数据替换成真实列表，不需要重新生成 UI 图片。
- 如果要新增页面或明显改变布局，必须先生成参考图，再做 UI。
- UI 不允许继续硬编码假工作区、假 Agent、假 Skill、假 session。可以有空状态，但不能伪装成真实数据。

---

## 1. File Responsibility Map

### Shared Types

- `dashboard/shared/src/index.ts`
  - 健康检查类型。
  - 工作区类型。
  - Agent/Skill 轻量类型。
  - Run 类型。
  - Session 索引类型。
  - API 错误类型。

### Backend

- `dashboard/backend/src/index.ts`
  - 注册 API route。
- `dashboard/backend/src/config.ts`
  - repo root、data dir、occ path、端口。
- `dashboard/backend/src/services/occ-runner.ts`
  - 唯一 `occ` 调用入口。
- `dashboard/backend/src/services/json-store.ts`
  - 原子读写 JSON。
- `dashboard/backend/src/services/workspace-store.ts`
  - 工作区列表持久化。
- `dashboard/backend/src/services/run-store.ts`
  - dashboard run 状态。
- `dashboard/backend/src/services/run-service.ts`
  - `occ run` 调度。
- `dashboard/backend/src/services/session-index-service.ts`
  - 聚合 `occ` run/session 索引。
- `dashboard/backend/src/services/artifact-service.ts`
  - 安全读取 result/log 路径。
- `dashboard/backend/src/routes/workspaces.ts`
- `dashboard/backend/src/routes/runs.ts`
- `dashboard/backend/src/routes/sessions.ts`
- `dashboard/backend/src/routes/events.ts`
- `dashboard/backend/src/routes/agents.ts`
- `dashboard/backend/src/routes/skills.ts`

### Frontend

- `dashboard/frontend/src/App.tsx`
  - 只挂载当前开放页面。
- `dashboard/frontend/src/components/layout/LeftNavigation.tsx`
  - 隐藏未开放入口。
- `dashboard/frontend/src/pages/HomePage.tsx`
  - 调度入口和队列。
- `dashboard/frontend/src/pages/WorkspacesPage.tsx`
  - 真实工作区列表。
- `dashboard/frontend/src/pages/SessionsPage.tsx`
  - 会话/run 索引。
- `dashboard/frontend/src/pages/RunsPage.tsx`
  - 运行记录。
- `dashboard/frontend/src/components/runs/*`
  - 拆分后的真实 run 组件。
- `dashboard/frontend/src/components/workspaces/*`
  - 工作区组件。
- `dashboard/frontend/src/components/sessions/*`
  - session 索引组件。

---

## M1.2: Hide Non-Core UI And Remove Fake Navigation

**Goal:** 不继续展示还没后端支撑的假页面，避免用户误以为功能已经完成。

### Task M1.2.1: Hide Overbuilt Navigation Items

**Files:**

- Modify: `dashboard/frontend/src/components/layout/LeftNavigation.tsx`
- Modify: `dashboard/frontend/src/components/layout/AppShell.tsx`
- Modify: `dashboard/frontend/src/App.tsx`

- [ ] **Step 1: Replace nav list with core items**

Use only these items:

```ts
const navItems = [
  { key: "overview", label: "总览", icon: Home },
  { key: "workspace", label: "工作区", icon: Boxes },
  { key: "sessions", label: "会话", icon: MessageSquare },
  { key: "runs", label: "运行记录", icon: ClipboardList },
] as const;
```

- [ ] **Step 2: Keep hidden items documented in code**

Add a non-rendered constant:

```ts
const hiddenFutureNavItems = ["Agents", "Skills", "Agent 开发", "设置"];
```

Do not render it.

- [ ] **Step 3: Route hidden pages to overview**

`App.tsx` should not import `AgentBuilderPage` or `AgentsSkillsPage` in the core build.

- [ ] **Step 4: Verify**

Run: `npm run typecheck` from `dashboard`.
Expected: no unused imports and typecheck passes.

### Task M1.2.2: Replace Fake Workspace List With Loading/Empty State

**Files:**

- Modify: `dashboard/frontend/src/components/layout/LeftNavigation.tsx`
- Modify: `dashboard/frontend/src/api/client.ts`

- [ ] **Step 1: Add workspace API client placeholder**

```ts
export type WorkspaceSummary = {
  id: string;
  name: string;
  path: string;
  active: boolean;
  runningCount: number;
};

export async function getWorkspaces(): Promise<WorkspaceSummary[]> {
  const response = await fetch("/api/workspaces", { headers: { Accept: "application/json" } });
  if (response.status === 404) return [];
  if (!response.ok) throw new Error(`Workspace request failed: ${response.status}`);
  return response.json() as Promise<WorkspaceSummary[]>;
}
```

- [ ] **Step 2: Show honest empty state**

Before `/api/workspaces` exists, show:

```tsx
<p className="muted-note">工作区后端接口尚未接入</p>
```

No fake `AgentPanels / Website / Docs` list.

- [ ] **Step 3: Verify no fake workspace names remain in navigation**

Run:

```powershell
rg "Website|Docs|运行中 3|运行中 2" dashboard/frontend/src
```

Expected: no matches, except docs/plans if any.

### Task M1.2.3: Fix Skill Overflow By Hiding Skill Rail Until Real Data

**Files:**

- Modify: `dashboard/frontend/src/pages/HomePage.tsx`
- Modify: `dashboard/frontend/src/styles/global.css`

- [ ] **Step 1: Replace skill chips with compact placeholder**

Replace `已选 Skills` chips with:

```tsx
<section className="rail-card">
  <div className="rail-title">分派预设</div>
  <p className="muted-note">M2 接入真实 Agent / Skill 后显示</p>
</section>
```

- [ ] **Step 2: Add safe text style**

```css
.muted-note {
  color: var(--muted);
  font-size: 13px;
  line-height: 1.5;
}
```

- [ ] **Step 3: Verify screenshot**

Use Chrome headless screenshot at 1280 and 1440. Expected: no Skill chip overflow.

---

## M2: Backend Foundation For Real Data

**Goal:** 后端先提供真实工作区、Agent、Skill、Run API；前端只接这些基础数据，不新增复杂 UI。

### Task M2.1: Shared Core Types

**Files:**

- Modify: `dashboard/shared/src/index.ts`

- [ ] **Step 1: Add API error type**

```ts
export type ApiErrorResponse = {
  ok: false;
  error: {
    code: string;
    message: string;
    source: "backend" | "occ" | "filesystem";
    details?: unknown;
  };
};
```

- [ ] **Step 2: Add workspace type**

```ts
export type DashboardWorkspace = {
  id: string;
  name: string;
  path: string;
  active: boolean;
  runningCount: number;
  createdAt: string;
  updatedAt: string;
};
```

- [ ] **Step 3: Add run type**

```ts
export type RunStatus = "queued" | "running" | "confirming" | "success" | "failed";

export type DashboardRun = {
  dashboardRunId: string;
  occRunId: string | null;
  workspaceId: string;
  agent: string;
  title: string;
  prompt: string;
  status: RunStatus;
  createdAt: string;
  updatedAt: string;
  resultPath: string | null;
  stdoutPath: string | null;
  stderrPath: string | null;
  sessionId: string | null;
  error: string | null;
};
```

- [ ] **Step 4: Add session index type**

```ts
export type SessionSource = "occ" | "codex" | "claude" | "gemini" | "opencode";

export type SessionIndexItem = {
  id: string;
  source: SessionSource;
  workspaceId: string | null;
  workspacePath: string | null;
  agent: string | null;
  title: string;
  updatedAt: string;
  lastRunId: string | null;
  resultPath: string | null;
};
```

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck` from `dashboard`.
Expected: passes.

### Task M2.2: JSON Store

**Files:**

- Create: `dashboard/backend/src/services/json-store.ts`
- Test: `dashboard/backend/src/services/json-store.test.ts`

- [ ] **Step 1: Write tests**

```ts
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
```

- [ ] **Step 2: Implement store**

```ts
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return fallback;
    throw error;
  }
}

export async function writeJsonFile<T>(filePath: string, value: T): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(tmp, filePath);
}
```

- [ ] **Step 3: Verify**

Run: `npm test` from `dashboard`.
Expected: all tests pass.

### Task M2.3: Workspace Backend

**Files:**

- Create: `dashboard/backend/src/services/workspace-store.ts`
- Create: `dashboard/backend/src/routes/workspaces.ts`
- Modify: `dashboard/backend/src/index.ts`
- Test: `dashboard/backend/src/services/workspace-store.test.ts`

- [ ] **Step 1: Test seed behavior**

Expected seed workspaces:

- `AgentPanels` -> repo root
- `one-code-cli` -> repo root + `/one-code-cli` when exists

- [ ] **Step 2: Implement store**

Rules:

- Persist to `dashboard/backend/data/workspaces.json`.
- Validate workspace path exists.
- Generate stable id from normalized path hash.
- Only one active workspace.

- [ ] **Step 3: Implement routes**

Routes:

- `GET /api/workspaces`
- `POST /api/workspaces`
- `POST /api/workspaces/:id/activate`

- [ ] **Step 4: Verify manually**

Run:

```powershell
Invoke-RestMethod http://127.0.0.1:43110/api/workspaces
```

Expected: real workspace list, no fake `Website` or `Docs`.

### Task M2.4: Lightweight Agent And Skill Backend

**Files:**

- Create: `dashboard/backend/src/services/agent-service.ts`
- Create: `dashboard/backend/src/routes/agents.ts`
- Create: `dashboard/backend/src/services/skill-service.ts`
- Create: `dashboard/backend/src/routes/skills.ts`
- Modify: `dashboard/backend/src/index.ts`

- [ ] **Step 1: Agent list wraps occ**

`GET /api/agents` calls:

```text
occ agents list
```

Return shape:

```ts
type LightweightAgent = {
  name: string;
  cli: string;
  available: boolean;
  raw: string;
};
```

- [ ] **Step 2: Skill list wraps occ**

`GET /api/skills` calls:

```text
occ skills list
```

Return shape:

```ts
type LightweightSkill = {
  name: string;
  installed: boolean;
  raw: string;
};
```

- [ ] **Step 3: No complex management yet**

Do not implement install/edit UI yet. Backend may expose `GET` only in this milestone.

- [ ] **Step 4: Verify**

Run:

```powershell
Invoke-RestMethod http://127.0.0.1:43110/api/agents
Invoke-RestMethod http://127.0.0.1:43110/api/skills
```

Expected: returns parsed best-effort data plus raw output.

---

## M3: Real Run Dispatch

**Goal:** UI 输入任务后，后端调用 `occ run`，生成真实运行记录。

### Task M3.1: Run Store

**Files:**

- Create: `dashboard/backend/src/services/run-store.ts`
- Test: `dashboard/backend/src/services/run-store.test.ts`

Rules:

- Create `dashboardRunId` before calling `occ`.
- Store status `queued -> running -> confirming/success/failed`.
- `occ success=true` maps to `confirming` by default.
- Persist to `dashboard/backend/data/runs.json`.

### Task M3.2: Run Service

**Files:**

- Create: `dashboard/backend/src/services/run-service.ts`
- Modify: `dashboard/backend/src/services/occ-runner.ts`

Command:

```text
occ run --agent <agent> --cwd <workspacePath> --output json --stream <prompt>
```

Behavior:

- Capture stdout/stderr.
- Parse final JSON.
- Bind `occRunId`, `sessionId`, `resultPath` when available.
- Preserve raw error on failure.

### Task M3.3: Runs API

**Files:**

- Create: `dashboard/backend/src/routes/runs.ts`
- Modify: `dashboard/backend/src/index.ts`

Routes:

- `GET /api/runs?workspaceId=...`
- `POST /api/runs`
- `GET /api/runs/:dashboardRunId`
- `POST /api/runs/:dashboardRunId/confirm`

### Task M3.4: Minimal Frontend Dispatch

**Files:**

- Modify: `dashboard/frontend/src/api/client.ts`
- Modify: `dashboard/frontend/src/pages/HomePage.tsx`

Rules:

- Replace fake pipeline with API data.
- If no runs, show empty state.
- Submit task calls `POST /api/runs`.
- Do not build a new run detail page yet.
- Each run card has buttons: `查看结果`, `查看日志`, `确认完成`.

---

## M4: Session Index, Not Chat Clone

**Goal:** 能查看 CLI/occ 会话索引和结果入口，但不做完整聊天系统。

### Task M4.1: Occ Session Index First

**Files:**

- Create: `dashboard/backend/src/services/session-index-service.ts`
- Create: `dashboard/backend/src/routes/sessions.ts`
- Modify: `dashboard/backend/src/index.ts`

Behavior:

- First source: `occ sessions list` and `occ runs list` / run index files.
- Return `SessionIndexItem[]`.
- If CLI-specific sessions are not supported by `occ` yet, return only occ-known sessions and include `missingSources`.

### Task M4.2: Plan Occ Session Aggregation Enhancement

**Files:**

- Modify: `one-code-cli/src/commands/sessions.rs`
- Modify: `one-code-cli/src/session.rs`

Target commands:

```text
occ sessions list --source all --output json
occ sessions show <id> --source codex --output json
```

This is the proper place to read Codex/Claude/Gemini/opencode session stores so AgentPanels backend still only calls `occ`.

### Task M4.3: Sessions UI Index

**Files:**

- Create: `dashboard/frontend/src/pages/SessionsPage.tsx`
- Modify: `dashboard/frontend/src/App.tsx`
- Modify: `dashboard/frontend/src/api/client.ts`

UI:

- Table/list of sessions.
- Columns: source, title, agent, workspace, updated time, result.
- Actions: `打开结果`, `打开日志`, `继续会话`.
- No full chat rendering in this milestone.

---

## M5: Result And Artifact Entry Points

**Goal:** 用户可以从 run/session 打开 result 和 logs，而不是在 UI 里重做 IDE。

### Task M5.1: Artifact Backend

**Files:**

- Create: `dashboard/backend/src/services/artifact-service.ts`
- Create: `dashboard/backend/src/routes/artifacts.ts`
- Modify: `dashboard/backend/src/index.ts`

Routes:

- `GET /api/runs/:dashboardRunId/result`
- `GET /api/runs/:dashboardRunId/logs/stdout`
- `GET /api/runs/:dashboardRunId/logs/stderr`
- `POST /api/runs/:dashboardRunId/open-result`
- `POST /api/runs/:dashboardRunId/open-workspace`

Security:

- Only resolve artifacts inside known occ run directories.
- Reject path traversal.

### Task M5.2: Frontend Result Drawer

**Files:**

- Create: `dashboard/frontend/src/components/runs/ResultDrawer.tsx`
- Modify: `dashboard/frontend/src/pages/HomePage.tsx`
- Modify: `dashboard/frontend/src/pages/RunsPage.tsx`

UI:

- Drawer shows result markdown text.
- Buttons open result/workspace via backend.
- Logs shown as plain text tabs.

---

## M6: Lightweight Presets Instead Of Complex Agent Builder

**Goal:** 可以配置常用分派预设，但不做复杂 Agent 开发器。

### Task M6.1: Preset Store

**Files:**

- Create: `dashboard/backend/src/services/preset-store.ts`
- Create: `dashboard/backend/src/routes/presets.ts`
- Modify: `dashboard/backend/src/index.ts`

Preset type:

```ts
export type DispatchPreset = {
  id: string;
  name: string;
  agent: string;
  skills: string[];
  promptPrefix: string;
};
```

### Task M6.2: Preset UI In Home Only

**Files:**

- Modify: `dashboard/frontend/src/pages/HomePage.tsx`

UI:

- Dropdown: `代码实现`, `代码审查`, `文档更新`, `测试修复`.
- Selecting preset changes agent/skills defaults.
- No Agent Builder page yet.

---

## M7: Minimal Multi-Workspace

**Goal:** 支持多个真实工作区，但不做全局大屏。

Tasks:

- Real workspace list in left nav.
- Add workspace dialog.
- Activate workspace.
- Home/runs/sessions filtered by active workspace.

No global board until core dispatch is stable.

---

## M8: Polish And Packaging Later

Only after M3-M5 usable:

- Diagnostics page.
- CI.
- Setup scripts.
- Tauri/desktop evaluation.

---

## Recommended Execution Order

1. `M1.2`：隐藏假 UI，导航收敛。
2. `M2.1-M2.3`：shared/json/workspace backend。
3. `M2.4`：轻量 agents/skills backend。
4. `M3`：真实 `occ run`。
5. `M4`：session 索引。
6. `M5`：result/log 入口。
7. `M6`：轻量预设。
8. `M7-M8`：多工作区、诊断、打包。

## What Not To Build Now

- 不做完整聊天 UI。
- 不做文件树浏览器。
- 不做复杂 Agent Builder。
- 不做 Skill 安装管理 UI。
- 不做全局多工作区大屏。
- 不做插件、审计、权限。
- 不直接读取各 CLI session 文件，优先让 `occ` 提供统一入口。
