# Agent Dashboard M2-M8 Detailed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把当前 M1 静态看板推进到可真实分派任务、查看运行过程、继续会话、管理 Agents/Skills、支持多工作区并可发布的中文 Agent 集成 UI。

**Architecture:** `dashboard/frontend` 只负责中文 UI 和浏览器状态，通过 HTTP/SSE 调用 `dashboard/backend`。`dashboard/backend` 是唯一能执行 `occ` 的层，所有任务分派、会话恢复、Agent/Skill 操作都通过 `one-code-cli/occ`，看板自己的状态单独保存在 `dashboard/backend/data`。

**Tech Stack:** React + Vite + TypeScript, Fastify + TypeScript, Node child_process spawn, SSE, JSON-file store for M2-M4, optional SQLite from M5, Rust `one-code-cli/occ`.

---

## 0. 当前 UI 截图审查

截图文件：

- `docs/reviews/m1-ui-overview-1440.png`
- `docs/reviews/m1-ui-overview-1280.png`
- `docs/reviews/m1-ui-overview-1440-polished.png`
- `docs/reviews/m1-ui-overview-1280-polished.png`

发现的问题：

- 1280 宽度时左侧导航过早收缩成图标栏，工作区列表不可见；原型的主要工作区上下文丢失。
- 1280 宽度时右侧 `主 Agent 调度` 被挤到主流水线下方，信息优先级从右侧调度变成下方详情，操作感变弱。
- 任务卡标题使用单行截断，`实现任务优先级排序`、`完善权限模型设计` 等核心信息被过早省略。
- 首页右侧区域内容偏短，1440 下右侧面板下方留白明显，应该补足快捷操作或活动 Agents。
- 首页底部事件流只占左侧主列，右侧空白较强；M2 后可改为跨主内容区或进入右侧调度的事件摘要。

这些问题进入 M1.1 UI 修复，不阻塞 M2，但在继续真实功能前先修掉，避免后续功能都落在不稳定布局上。

---

## 1. File Responsibility Map

### Shared

- `dashboard/shared/src/index.ts`：共享 API 类型，包括健康、工作区、Agent、Skill、Run、Session、事件类型。

### Backend App

- `dashboard/backend/src/index.ts`：Fastify app 创建、路由注册、启动入口。
- `dashboard/backend/src/config.ts`：端口、repo root、`OCC_PATH`、CORS、数据目录配置。
- `dashboard/backend/src/routes/health.ts`：健康检查。
- `dashboard/backend/src/routes/workspaces.ts`：工作区 API。
- `dashboard/backend/src/routes/agents.ts`：Agent API。
- `dashboard/backend/src/routes/skills.ts`：Skill API。
- `dashboard/backend/src/routes/runs.ts`：运行 API。
- `dashboard/backend/src/routes/events.ts`：SSE 事件流。
- `dashboard/backend/src/routes/sessions.ts`：会话 API。
- `dashboard/backend/src/routes/files.ts`：受控目录树、文件摘要、产物打开信息 API。
- `dashboard/backend/src/routes/reserved.ts`：插件、daemon、审计等预留接口。
- `dashboard/backend/src/services/occ-runner.ts`：唯一 `occ` 执行入口。
- `dashboard/backend/src/services/occ-artifacts.ts`：读取 run 产物。
- `dashboard/backend/src/services/event-bus.ts`：进程内事件总线。
- `dashboard/backend/src/services/json-store.ts`：原子读写 JSON。
- `dashboard/backend/src/services/workspace-store.ts`：工作区持久化。
- `dashboard/backend/src/services/run-store.ts`：dashboardRunId、运行状态缓存。
- `dashboard/backend/src/services/session-store.ts`：会话列表和消息聚合。
- `dashboard/backend/src/services/agent-service.ts`：包装 `occ agents ...`。
- `dashboard/backend/src/services/skill-service.ts`：包装 `occ skills ...`。
- `dashboard/backend/src/services/file-service.ts`：目录树扫描和文件读取白名单。
- `dashboard/backend/data/*.json`：看板状态文件，进入 git 时只提交 `.gitkeep` 或示例，不提交用户运行数据。

### Frontend App

- `dashboard/frontend/src/api/client.ts`：HTTP 客户端。
- `dashboard/frontend/src/api/events.ts`：SSE 客户端。
- `dashboard/frontend/src/App.tsx`：页面切换与顶层状态。
- `dashboard/frontend/src/components/layout/*`：应用壳、左侧导航、顶部命令栏。
- `dashboard/frontend/src/pages/HomePage.tsx`：当前工作区看板。
- `dashboard/frontend/src/pages/SessionDetailPage.tsx`：会话详情。
- `dashboard/frontend/src/pages/AgentsSkillsPage.tsx`：Agents / Skills / 工作区页。
- `dashboard/frontend/src/pages/AgentBuilderPage.tsx`：Agent 开发页。
- `dashboard/frontend/src/components/runs/*`：流水线、运行卡、运行状态。
- `dashboard/frontend/src/components/sessions/*`：目录树、消息、时间线、日志、产物。
- `dashboard/frontend/src/components/agents/*`：Agent 列表、详情、测试入口。
- `dashboard/frontend/src/components/skills/*`：Skill 列表、详情、安装入口。
- `dashboard/frontend/src/styles/global.css`：主题变量、布局基础、页面样式。

---

## M1.1: UI Polish Before Real Data

**Goal:** 修正当前 M1 首页布局问题，避免后续真实数据接入时放大视觉缺陷。

### Task M1.1.1: Keep Desktop Context At 1280px

**Files:**

- Modify: `dashboard/frontend/src/styles/global.css`

- [ ] **Step 1: Change collapse breakpoint**

Update the responsive breakpoint from `@media (max-width: 1280px)` to `@media (max-width: 1120px)` so 1280px keeps the full workspace context.

Expected CSS change:

```css
@media (max-width: 1120px) {
  body {
    min-width: 980px;
  }
}
```

- [ ] **Step 2: Verify 1280 screenshot**

Run:

```powershell
Start-Process -FilePath "C:\Program Files\Google\Chrome\Application\chrome.exe" -ArgumentList @('--headless=new','--disable-gpu','--window-size=1280,900','--screenshot=E:\Codes\AgentPanels\docs\reviews\m1-ui-overview-1280-after.png','http://127.0.0.1:43111') -Wait
```

Expected: left navigation remains readable at 1280px.

- [ ] **Step 3: Run frontend build**

Run: `npm run build` from `dashboard`.
Expected: build passes.

- [ ] **Step 4: Commit**

```powershell
git add dashboard/frontend/src/styles/global.css docs/reviews/m1-ui-overview-1280-after.png
git commit -m "polish dashboard desktop layout"
```

### Task M1.1.2: Stop Important Task Titles From Over-Truncating

**Files:**

- Modify: `dashboard/frontend/src/styles/global.css`

- [ ] **Step 1: Allow task titles to wrap to two lines**

Replace the shared truncation rule so queue rows remain single-line but task titles can wrap:

```css
.task-title strong {
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.35;
}

.queue-row strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

- [ ] **Step 2: Check screenshot**

Expected: `实现任务优先级排序` and `完善权限模型设计` are readable without breaking card layout.

- [ ] **Step 3: Run checks**

Run: `npm run typecheck && npm run build` from `dashboard`.
Expected: both pass.

### Task M1.1.3: Fill Right Rail With Useful Operations

**Files:**

- Modify: `dashboard/frontend/src/pages/HomePage.tsx`
- Modify: `dashboard/frontend/src/styles/global.css`

- [ ] **Step 1: Add quick actions and active agents to right rail**

Add sections under `已选 Skills`:

```tsx
<section className="rail-card">
  <div className="rail-title">活跃 Agents</div>
  {['codex 2 个运行中', 'claude 1 个运行中', 'gemini 1 个运行中', 'opencode 0 个运行中'].map((item) => (
    <div className="queue-row compact" key={item}>
      <span className="status-dot" />
      <strong>{item}</strong>
    </div>
  ))}
</section>
<section className="rail-card quick-actions">
  <button className="primary-button full" type="button">新建任务</button>
  <button className="ghost-button full" type="button">打开会话</button>
  <button className="ghost-button full" type="button">创建 Agent</button>
</section>
```

- [ ] **Step 2: Add compact styles**

```css
.queue-row.compact {
  grid-template-columns: 18px 1fr;
}

.quick-actions {
  display: grid;
  gap: 10px;
}

.ghost-button.full {
  width: 100%;
}
```

- [ ] **Step 3: Run build**

Run: `npm run build` from `dashboard`.
Expected: build passes.

---

## M2: Real Run MVP

**Goal:** 用户可以在 UI 输入任务，后端创建 `dashboardRunId`，调用 `occ run --output json --stream`，看板显示运行状态、完成结果和日志入口。

### Task M2.1: Shared Run Types

**Files:**

- Modify: `dashboard/shared/src/index.ts`
- Test: `dashboard/backend/src/services/run-store.test.ts`

- [ ] **Step 1: Add run types**

Add these exports:

```ts
export type RunStatus = "queued" | "running" | "confirming" | "success" | "failed" | "cancelled";

export type DashboardRun = {
  dashboardRunId: string;
  runId: string | null;
  workspaceId: string;
  workspacePath: string;
  title: string;
  prompt: string;
  agent: string;
  skills: string[];
  status: RunStatus;
  progressLabel: string;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  resultPath: string | null;
  error: string | null;
};

export type CreateRunRequest = {
  workspaceId: string;
  title: string;
  prompt: string;
  agent: string;
  skills?: string[];
};

export type CreateRunResponse = {
  run: DashboardRun;
};
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck` from `dashboard`.
Expected: passes.

### Task M2.2: JSON Store Utility

**Files:**

- Create: `dashboard/backend/src/services/json-store.ts`
- Test: `dashboard/backend/src/services/json-store.test.ts`

- [ ] **Step 1: Write failing tests**

Test code:

```ts
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { readJsonFile, writeJsonFile } from "./json-store.js";

describe("json-store", () => {
  it("returns fallback when file does not exist", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "agentpanels-json-"));
    try {
      await expect(readJsonFile(path.join(dir, "missing.json"), { items: [] })).resolves.toEqual({ items: [] });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("writes and reads json atomically", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "agentpanels-json-"));
    const file = path.join(dir, "store.json");
    try {
      await writeJsonFile(file, { ok: true, count: 2 });
      await expect(readJsonFile(file, { ok: false })).resolves.toEqual({ ok: true, count: 2 });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
```

- [ ] **Step 2: Run test and confirm failure**

Run: `npm --workspace @agentpanels/backend test -- json-store`.
Expected: fails because `json-store.ts` does not exist.

- [ ] **Step 3: Implement utility**

```ts
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return fallback;
    }
    throw error;
  }
}

export async function writeJsonFile<T>(filePath: string, value: T): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(tempPath, filePath);
}
```

- [ ] **Step 4: Run tests**

Run: `npm test` from `dashboard`.
Expected: all tests pass.

### Task M2.3: Workspace Store and API

**Files:**

- Modify: `dashboard/shared/src/index.ts`
- Create: `dashboard/backend/src/services/workspace-store.ts`
- Create: `dashboard/backend/src/routes/workspaces.ts`
- Modify: `dashboard/backend/src/index.ts`
- Test: `dashboard/backend/src/services/workspace-store.test.ts`

- [ ] **Step 1: Add shared workspace types**

```ts
export type DashboardWorkspace = {
  id: string;
  name: string;
  path: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateWorkspaceRequest = {
  name: string;
  path: string;
};
```

- [ ] **Step 2: Test default workspace creation**

Create a test that initializes the store with repo root `E:\Codes\AgentPanels` and expects workspaces for `AgentPanels` and `one-code-cli` when paths exist.

- [ ] **Step 3: Implement store**

Store file path: `dashboard/backend/data/workspaces.json`.
Rules:

- `GET /api/workspaces` returns all workspaces.
- `POST /api/workspaces` validates `path` exists before saving.
- `POST /api/workspaces/:workspaceId/activate` sets one active workspace.
- Initial seed includes `AgentPanels` root and `one-code-cli` if present.

- [ ] **Step 4: Register route**

Add `registerWorkspaceRoutes(app, { store })` in `dashboard/backend/src/index.ts`.

- [ ] **Step 5: Verify**

Run:

```powershell
Invoke-RestMethod http://127.0.0.1:43110/api/workspaces
```

Expected: returns at least `AgentPanels` and `one-code-cli`.

### Task M2.4: Event Bus and SSE

**Files:**

- Modify: `dashboard/shared/src/index.ts`
- Create: `dashboard/backend/src/services/event-bus.ts`
- Create: `dashboard/backend/src/routes/events.ts`
- Modify: `dashboard/backend/src/index.ts`
- Create: `dashboard/frontend/src/api/events.ts`

- [ ] **Step 1: Add event type**

```ts
export type DashboardEvent =
  | { type: "run.created"; run: DashboardRun; at: string }
  | { type: "run.started"; dashboardRunId: string; at: string }
  | { type: "run.output"; dashboardRunId: string; stream: "stdout" | "stderr"; chunk: string; at: string }
  | { type: "run.bound"; dashboardRunId: string; runId: string; at: string }
  | { type: "run.finished"; run: DashboardRun; at: string }
  | { type: "workspace.changed"; workspaceId: string; at: string };
```

- [ ] **Step 2: Implement in-memory bus**

Expose `publish(event)` and `subscribe(listener)`.

- [ ] **Step 3: Implement SSE route**

`GET /api/events` returns `text/event-stream`, sends `event: message` and JSON data.

- [ ] **Step 4: Frontend client**

`connectDashboardEvents(onEvent)` uses `EventSource('/api/events')` and parses `DashboardEvent`.

- [ ] **Step 5: Verify with curl-like request**

Run: `Invoke-WebRequest http://127.0.0.1:43110/api/events` in a separate terminal.
Expected: connection stays open and receives events after creating a run.

### Task M2.5: Run Store

**Files:**

- Create: `dashboard/backend/src/services/run-store.ts`
- Test: `dashboard/backend/src/services/run-store.test.ts`

- [ ] **Step 1: Test create/update flow**

Expected behavior:

- `createRun()` returns `dashboardRunId` before `occ` starts.
- `markStarted()` sets `status='running'`.
- `bindOccRun()` sets `runId`.
- `markFinished({ success: true })` sets `status='confirming'`, not `success`.
- `confirmRun()` sets `status='success'`.

- [ ] **Step 2: Implement store**

Persist to `dashboard/backend/data/runs.json`.

- [ ] **Step 3: Run test**

Run: `npm --workspace @agentpanels/backend test -- run-store`.
Expected: passes.

### Task M2.6: Occ Run Service

**Files:**

- Modify: `dashboard/backend/src/services/occ-runner.ts`
- Create: `dashboard/backend/src/services/run-service.ts`
- Test: `dashboard/backend/src/services/run-service.test.ts`

- [ ] **Step 1: Add streaming process API**

Add `spawnOcc(args, options)` returning callbacks for stdout/stderr/close. Keep `runOcc()` for short commands.

- [ ] **Step 2: Test command construction**

Given request `{ agent: 'codex', prompt: '修复测试', workspacePath: 'E:\Codes\AgentPanels' }`, expected args include:

```ts
[
  "run",
  "--agent",
  "codex",
  "--cwd",
  "E:\\Codes\\AgentPanels",
  "--output",
  "json",
  "--stream",
  "修复测试"
]
```

- [ ] **Step 3: Implement service**

Rules:

- Create dashboard run first.
- Publish `run.created`.
- Start `occ run`.
- Publish `run.started`.
- Stream stderr/stdout chunks as events.
- On close, parse final stdout JSON.
- If JSON includes `run_id`, bind it.
- If `success=true`, status becomes `confirming`.
- If process fails or JSON invalid, status becomes `failed` with error.

- [ ] **Step 4: Verify with fake occ script**

Use a temp Node script as `OCC_PATH` that prints JSON and exits 0.
Expected: run becomes `confirming`.

### Task M2.7: Runs API

**Files:**

- Create: `dashboard/backend/src/routes/runs.ts`
- Modify: `dashboard/backend/src/index.ts`
- Test: `dashboard/backend/src/routes/runs.test.ts`

- [ ] **Step 1: Implement endpoints**

Endpoints:

- `GET /api/runs?workspaceId=...`
- `POST /api/runs`
- `GET /api/runs/:dashboardRunId`
- `POST /api/runs/:dashboardRunId/confirm`
- `POST /api/runs/:dashboardRunId/retry` returns `501` in M2.

- [ ] **Step 2: Validate request body**

Reject with 400 when `workspaceId`, `prompt`, or `agent` is missing.

- [ ] **Step 3: Test happy path**

Use fake run service. Expected `POST /api/runs` returns `202` and `CreateRunResponse`.

### Task M2.8: Artifact Reader

**Files:**

- Create: `dashboard/backend/src/services/occ-artifacts.ts`
- Create: `dashboard/backend/src/routes/artifacts.ts`
- Modify: `dashboard/backend/src/index.ts`
- Test: `dashboard/backend/src/services/occ-artifacts.test.ts`

- [ ] **Step 1: Implement safe artifact resolver**

Inputs: `workspacePath`, `runId`, `artifactName`.
Allowed names: `result.md`, `stdout.log`, `stderr.log`, `events.jsonl`, `command.json`, `run.toml`.
Reject `..`, absolute paths, and unknown names.

- [ ] **Step 2: Implement endpoints**

- `GET /api/runs/:dashboardRunId/result`
- `GET /api/runs/:dashboardRunId/logs/stdout`
- `GET /api/runs/:dashboardRunId/logs/stderr`

- [ ] **Step 3: Test traversal rejection**

Requesting `../../README.md` returns 400.

### Task M2.9: Frontend Runs Integration

**Files:**

- Modify: `dashboard/frontend/src/api/client.ts`
- Create: `dashboard/frontend/src/components/runs/RunPipeline.tsx`
- Create: `dashboard/frontend/src/components/runs/RunCard.tsx`
- Create: `dashboard/frontend/src/components/runs/MainAgentSchedulerPanel.tsx`
- Modify: `dashboard/frontend/src/pages/HomePage.tsx`

- [ ] **Step 1: Add client methods**

Methods:

```ts
export async function listWorkspaces(): Promise<DashboardWorkspace[]>;
export async function listRuns(workspaceId: string): Promise<DashboardRun[]>;
export async function createRun(request: CreateRunRequest): Promise<CreateRunResponse>;
export async function confirmRun(dashboardRunId: string): Promise<DashboardRun>;
```

- [ ] **Step 2: Replace static pipeline**

Map run statuses:

- `queued` -> `待分派`
- `running` -> `执行中`
- `confirming` -> `待确认`
- `success` -> `已完成`
- `failed` -> `失败`

- [ ] **Step 3: Wire command bar submit**

Top command input creates a run against active workspace and selected agent.

- [ ] **Step 4: Subscribe to SSE**

On `run.created`/`run.finished`, update cards without full refresh.

- [ ] **Step 5: Verify manually**

Use a fake `OCC_PATH`, create a run, see card move to `待确认`.

### M2 Exit Criteria

- [ ] User can create a run from UI.
- [ ] Backend actually calls `occ run`.
- [ ] Card appears immediately with `dashboardRunId`.
- [ ] Completed occ success maps to `待确认`.
- [ ] User can confirm and move card to `已完成`.
- [ ] Result/log endpoints exist.

---

## M3: Session Detail and Resume

**Goal:** 用户可以打开会话，看目录、对话、执行时间线、日志、产物，并通过 `occ run --session <id> --resume` 继续会话。

### Task M3.1: Shared Session Types

**Files:**

- Modify: `dashboard/shared/src/index.ts`

Add:

```ts
export type DashboardSession = {
  sessionId: string;
  workspaceId: string;
  workspacePath: string;
  agent: string;
  title: string;
  status: "active" | "completed" | "failed";
  lastRunId: string | null;
  updatedAt: string;
};

export type DashboardMessage = {
  id: string;
  sessionId: string;
  role: "user" | "main-agent" | "agent" | "system";
  agent: string | null;
  content: string;
  createdAt: string;
  runId: string | null;
};

export type ResumeSessionRequest = {
  prompt: string;
  agent?: string;
};
```

### Task M3.2: Session Store

**Files:**

- Create: `dashboard/backend/src/services/session-store.ts`
- Test: `dashboard/backend/src/services/session-store.test.ts`

Tasks:

- [ ] Read dashboard messages from `dashboard/backend/data/messages.json`.
- [ ] Read `~/.occ/sessions.sqlite` only when file exists.
- [ ] Merge occ session metadata with dashboard messages by `sessionId`.
- [ ] If SQLite read fails, return dashboard messages and a warning string, not 500.

### Task M3.3: Sessions API

**Files:**

- Create: `dashboard/backend/src/routes/sessions.ts`
- Modify: `dashboard/backend/src/index.ts`
- Test: `dashboard/backend/src/routes/sessions.test.ts`

Endpoints:

- `GET /api/sessions?workspaceId=...`
- `GET /api/sessions/:sessionId`
- `GET /api/sessions/:sessionId/messages`
- `POST /api/sessions/:sessionId/resume`

Resume rule:

```text
occ run --session <sessionId> --resume --cwd <workspacePath> --output json --stream <prompt>
```

### Task M3.4: File Tree API

**Files:**

- Create: `dashboard/backend/src/services/file-service.ts`
- Create: `dashboard/backend/src/routes/files.ts`
- Modify: `dashboard/backend/src/index.ts`
- Test: `dashboard/backend/src/services/file-service.test.ts`

Rules:

- Only scan registered workspace paths.
- Max depth for M3: 4.
- Ignore `node_modules`, `target`, `.git`, `dist`, `.worktrees`.
- Return directory nodes and file nodes with relative paths.

### Task M3.5: Frontend Session Page Real Data

**Files:**

- Modify: `dashboard/frontend/src/api/client.ts`
- Create: `dashboard/frontend/src/components/sessions/DirectoryTree.tsx`
- Create: `dashboard/frontend/src/components/sessions/ConversationPanel.tsx`
- Create: `dashboard/frontend/src/components/sessions/ExecutionTimeline.tsx`
- Create: `dashboard/frontend/src/components/sessions/ArtifactPanel.tsx`
- Modify: `dashboard/frontend/src/pages/SessionDetailPage.tsx`

Tasks:

- [ ] Load `GET /api/sessions/:sessionId`.
- [ ] Load messages.
- [ ] Load directory tree.
- [ ] Show selected run logs and artifacts.
- [ ] Submit follow-up through `POST /api/sessions/:sessionId/resume`.

### M3 Exit Criteria

- [ ] User opens a session from run card.
- [ ] Session page shows directory tree, messages, timeline, logs, artifacts.
- [ ] User sends follow-up and backend calls `occ run --session ... --resume`.

---

## M4: Agents, Skills, and Agent Builder

**Goal:** 用户可以查看、测试、创建 Agent；查看、安装、启用 Skill；所有写操作通过 `occ`。

### Task M4.1: Agent Types and Parser

**Files:**

- Modify: `dashboard/shared/src/index.ts`
- Create: `dashboard/backend/src/services/agent-service.ts`
- Test: `dashboard/backend/src/services/agent-service.test.ts`

Requirements:

- `GET /api/agents` wraps `occ agents list`.
- If output is table text, parse best-effort into `DashboardAgent[]`.
- Preserve raw output in `details.raw`.

### Task M4.2: Agent API

**Files:**

- Create: `dashboard/backend/src/routes/agents.ts`
- Modify: `dashboard/backend/src/index.ts`

Endpoints:

- `GET /api/agents`
- `GET /api/agents/:name`
- `POST /api/agents/:name/test`
- `POST /api/agents`

Creation rule:

- Use `occ agents add` if supported.
- If `occ agents add` is missing, return `501` with `requiredOccCommand: "occ agents add"`.
- Do not write config directly in dashboard backend.

### Task M4.3: Skill Service and API

**Files:**

- Create: `dashboard/backend/src/services/skill-service.ts`
- Create: `dashboard/backend/src/routes/skills.ts`
- Modify: `dashboard/backend/src/index.ts`
- Test: `dashboard/backend/src/services/skill-service.test.ts`

Endpoints:

- `GET /api/skills`
- `GET /api/skills/:name`
- `POST /api/skills/install`
- `POST /api/skills/:name/enable`
- `POST /api/skills/:name/disable`

Rules:

- Install calls `occ skills install`.
- Enable/disable is dashboard preference only, stored in `dashboard/backend/data/skill-preferences.json`.

### Task M4.4: Frontend Agents/Skills Real Data

**Files:**

- Modify: `dashboard/frontend/src/pages/AgentsSkillsPage.tsx`
- Create: `dashboard/frontend/src/components/agents/AgentList.tsx`
- Create: `dashboard/frontend/src/components/skills/SkillList.tsx`
- Create: `dashboard/frontend/src/components/skills/SkillDetail.tsx`

Tasks:

- [ ] Replace static Agents with `GET /api/agents`.
- [ ] Replace static Skills with `GET /api/skills`.
- [ ] Add agent test button.
- [ ] Add skill install button.
- [ ] Show raw output drawer when parsing is imperfect.

### Task M4.5: Agent Builder Save Flow

**Files:**

- Modify: `dashboard/frontend/src/pages/AgentBuilderPage.tsx`
- Create: `dashboard/frontend/src/components/agents/AgentBuilderForm.tsx`
- Create: `dashboard/frontend/src/components/agents/AgentConfigPreview.tsx`

Tasks:

- [ ] Form state for name, description, cli, command, model, effort, timeout, skills, capabilities.
- [ ] Live preview of `profile.toml`.
- [ ] `测试运行` calls `POST /api/agents/:name/test` only after a temporary config is supported; until then button disabled with message `需要 occ agents test 支持临时配置`.
- [ ] `保存 Agent` calls `POST /api/agents`.

### M4 Exit Criteria

- [ ] Agents list comes from `occ`.
- [ ] Skills list comes from `occ`.
- [ ] Agent Builder no longer only是静态展示.
- [ ] Dashboard does not directly edit occ config files.

---

## M5: Multi-Workspace and Global View

**Goal:** 一个看板可以管理多个工作区，但默认仍聚焦当前工作区。

### Task M5.1: Workspace Context in Frontend

**Files:**

- Create: `dashboard/frontend/src/state/workspace-context.tsx`
- Modify: `dashboard/frontend/src/components/layout/TopCommandBar.tsx`
- Modify: `dashboard/frontend/src/components/layout/LeftNavigation.tsx`

Tasks:

- [ ] Load workspaces once at app start.
- [ ] Active workspace controls home, runs, sessions, agents/skills context.
- [ ] Switching workspace publishes `workspace.changed` locally and calls backend activate endpoint.

### Task M5.2: Global Overview Page

**Files:**

- Create: `dashboard/frontend/src/pages/GlobalOverviewPage.tsx`
- Modify: `dashboard/frontend/src/App.tsx`
- Create: `dashboard/backend/src/routes/global.ts`

Global API:

- `GET /api/global/summary`

Returns:

```ts
{
  workspaces: Array<{ id: string; name: string; running: number; confirming: number; failed: number }>;
  activeRuns: DashboardRun[];
  recentEvents: DashboardEvent[];
}
```

### Task M5.3: Per-Workspace Aggregation

**Files:**

- Modify: `dashboard/backend/src/services/run-store.ts`
- Modify: `dashboard/backend/src/services/session-store.ts`

Tasks:

- [ ] Add `listRunsByWorkspace()`.
- [ ] Add `listSessionsByWorkspace()`.
- [ ] Add counts for running, confirming, failed, success.

### M5 Exit Criteria

- [ ] Left workspace list is real.
- [ ] Current workspace view remains uncluttered.
- [ ] Global view summarizes all workspaces without becoming the default noisy page.

---

## M6: Diagnostics, Safety, and UX Hardening

**Goal:** 用户能理解失败原因，危险操作有边界，系统不因为底层 CLI 异常变成黑盒。

### Task M6.1: Diagnostics API

**Files:**

- Create: `dashboard/backend/src/routes/diagnostics.ts`
- Create: `dashboard/backend/src/services/diagnostics-service.ts`
- Modify: `dashboard/backend/src/index.ts`

Endpoints:

- `GET /api/diagnostics`
- `POST /api/diagnostics/refresh`

Checks:

- `occ --version`
- `occ doctor`
- configured CLIs from doctor output
- workspace path readability
- data directory writability

### Task M6.2: Error Model

**Files:**

- Modify: `dashboard/shared/src/index.ts`
- Modify: all backend route files

Add:

```ts
export type ApiErrorResponse = {
  ok: false;
  error: {
    code: string;
    message: string;
    source: "frontend" | "backend" | "occ" | "filesystem";
    details?: unknown;
  };
};
```

Rules:

- Validation errors use 400.
- Missing resource uses 404.
- Occ command failures use 502.
- Unimplemented reserved features use 501.

### Task M6.3: Cancel and Retry UX

**Files:**

- Modify: `dashboard/backend/src/routes/runs.ts`
- Modify: `dashboard/frontend/src/components/runs/RunCard.tsx`

M6 behavior:

- Cancel returns 501 unless `occ run cancel` exists.
- Retry creates a new run with same prompt/agent/workspace.
- UI explains when cancel is unavailable: `当前 occ 版本还没有取消运行接口`.

### Task M6.4: Audit Events

**Files:**

- Create: `dashboard/backend/src/services/audit-store.ts`
- Create: `dashboard/backend/src/routes/audit.ts`
- Modify: `dashboard/backend/src/index.ts`

Audit records:

- workspace added/activated
- run created/confirmed/retried
- session resumed
- agent created/tested
- skill installed/enabled/disabled

### M6 Exit Criteria

- [ ] Every backend failure returns structured JSON.
- [ ] UI shows useful failure states.
- [ ] Dangerous or unavailable operations are explicit, not silent.

---

## M7: Occ Enhancements Needed for a Polished Dashboard

**Goal:** 补齐 `one-code-cli` 对看板友好的结构化接口，减少表格解析和运行期盲区。

### Task M7.1: JSON List Outputs in one-code-cli

**Files:**

- Modify: `one-code-cli/src/commands/runs.rs`
- Modify: `one-code-cli/src/commands/sessions.rs`
- Modify: `one-code-cli/src/commands/profiles.rs`
- Modify: `one-code-cli/src/commands/skills_cmd.rs`
- Modify: `one-code-cli/src/output.rs`

Commands:

- `occ runs list --output json`
- `occ sessions list --output json`
- `occ agents list --output json`
- `occ skills list --output json`

Tests:

- Add Rust integration tests for each JSON output.

### Task M7.2: Early Run Started Event

**Files:**

- Modify: `one-code-cli/src/runner.rs`
- Modify: `one-code-cli/src/documents.rs`
- Modify: `one-code-cli/src/output.rs`

Requirement:

`occ run --stream --output json` emits an early event containing:

```json
{
  "type": "run_started",
  "run_id": "run_xxx",
  "session_id": "sess_xxx",
  "run_dir": "...",
  "stdout_log": "...",
  "stderr_log": "..."
}
```

### Task M7.3: Agent Update Command

**Files:**

- Modify: `one-code-cli/src/commands/profiles.rs`
- Modify: `one-code-cli/src/config.rs`

Command:

```text
occ agents update <name> --model <model> --effort <effort> --timeout <seconds>
```

Dashboard impact:

- Agent Builder can edit existing agents without writing config directly.

### Task M7.4: Run Cancel Strategy

**Files:**

- Modify: `one-code-cli/src/runner.rs`
- Add docs in `one-code-cli/README.zh-CN.md`

Minimum acceptable M7 behavior:

- Document that dashboard can only cancel child process it owns during current backend lifetime.
- Long-term command target: `occ run cancel <run_id>`.

### M7 Exit Criteria

- [ ] Dashboard backend stops parsing tables when JSON is available.
- [ ] Running logs can attach to run directory earlier.
- [ ] Agent Builder can update agents through occ commands.

---

## M8: Packaging and Release

**Goal:** 用户可以 clone 仓库后稳定运行，也可以后续打包成桌面壳。

### Task M8.1: Root Scripts

**Files:**

- Create or Modify: root `package.json`
- Modify: `README.md`

Scripts:

```json
{
  "scripts": {
    "dashboard:install": "npm install --prefix dashboard",
    "dashboard:dev:backend": "npm run --prefix dashboard dev:backend",
    "dashboard:dev:frontend": "npm run --prefix dashboard dev:frontend",
    "dashboard:test": "npm test --prefix dashboard",
    "dashboard:build": "npm run build --prefix dashboard",
    "occ:build": "cargo build --manifest-path one-code-cli/Cargo.toml"
  }
}
```

### Task M8.2: Setup Doctor Script

**Files:**

- Create: `scripts/doctor.ps1`
- Create: `scripts/doctor.sh`

Checks:

- Node version.
- npm version.
- Rust/cargo availability.
- `one-code-cli/target/debug/occ(.exe)` availability.
- dashboard dependencies installed.
- ports 43110 and 43111 availability.

### Task M8.3: CI

**Files:**

- Create: `.github/workflows/dashboard-ci.yml`

Jobs:

- Install dashboard dependencies.
- Run `npm run typecheck --prefix dashboard`.
- Run `npm test --prefix dashboard`.
- Run `npm run build --prefix dashboard`.
- Run `cargo test --manifest-path one-code-cli/Cargo.toml`.

### Task M8.4: Desktop Wrapper Evaluation

**Files:**

- Create: `docs/agent-dashboard-packaging.zh-CN.md`

Decision matrix:

- Local Web first.
- Tauri only after M5 is usable.
- Desktop wrapper must still keep frontend -> backend -> occ boundary.

### M8 Exit Criteria

- [ ] Fresh clone setup documented.
- [ ] CI catches dashboard and occ build failures.
- [ ] Packaging decision documented.

---

## Execution Order

1. M1.1 UI polish.
2. M2 real run MVP.
3. M3 session detail and resume.
4. M4 Agents/Skills/Builder.
5. M5 multi-workspace/global view.
6. M6 diagnostics/safety.
7. M7 one-code-cli enhancements.
8. M8 packaging/release.

Do not start M7 before M2/M3 expose the actual pain points unless a dashboard task is blocked by missing `occ` capability.

---

## Self-Review

- Spec coverage: UI polish, run creation, session resume, Agents/Skills, multi-workspace, diagnostics, occ enhancements, and packaging are covered.
- Placeholder scan: no placeholder markers and no open-ended deferred implementation language.
- Type consistency: `confirming` is used as the UI-facing replacement for old `reviewing`; UI label is `待确认`.
- Risk: This is a long roadmap. Execute one milestone at a time, with tests and commits per task.
