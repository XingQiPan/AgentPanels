# Agent Dashboard Usable Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a usable local Agent dashboard for `AgentPanels` that manages multiple workspaces, delegates work through `one-code-cli/occ`, opens sessions with execution detail, and supports Agents, Skills, and custom Agent creation.

**Architecture:** The dashboard is split into `dashboard/frontend`, `dashboard/backend`, and `dashboard/shared`. The frontend only talks to the backend over HTTP/SSE. The backend is the only layer allowed to execute `occ`; it reads `occ` artifacts for display and stores dashboard-only state separately.

**Tech Stack:** React + Vite + TypeScript frontend, Node.js + Fastify backend, shared TypeScript types, SSE for events, JSON-file persistence for M1/M2, SQLite after session/message persistence stabilizes, `one-code-cli/occ` as the only dispatch tool.

---

## 1. Usable Version Definition

“可用”不是只完成静态页面，也不是只跑通一次命令。可用版本必须满足：

- 用户能添加和切换多个工作区。
- 用户能看到当前工作区的运行流水线。
- 用户能选择 Agent，输入任务，并通过 `occ run` 分派。
- 用户能看到任务从 `queued` 到 `running` 到 `success/failed` 的状态。
- 用户能打开运行详情，看 `result.md`、stdout、stderr、`run.toml`、`command.json`。
- 用户能打开会话详情，看对话、执行过程、目录结构、日志、产物、运行信息。
- 用户能通过 `occ run --session ... --resume` 继续会话。
- 用户能查看 Agents、测试 Agent、创建基础自定义 Agent。
- 用户能查看 Skills、安装内置 Skills、在任务中选择 Skills。
- 用户能看到清晰的故障诊断：`occ` 不可用、Agent 不存在、CLI 未安装、运行失败、结果缺失。
- 前端不直接调用 `occ`，不直接读取本地文件。
- 所有操作动作都通过后端调用 `occ`。

---

## 2. Product Shape From Prototypes

开发必须先打开这些图片：

```text
docs/prototypes/01-workspace-focused-dashboard-cn.png
docs/prototypes/02-session-execution-detail-cn.png
docs/prototypes/03-workspace-skills-agents-cn.png
docs/prototypes/04-custom-agent-builder-cn.png
docs/prototypes/agent-dashboard-cn-prototype.png
```

### 2.1 Home Dashboard

首页按 `01-workspace-focused-dashboard-cn.png` 实现：

- 顶部：工作区切换、全局视图、任务输入、分派按钮。
- 左侧：总览、工作区、Agents、Skills、会话、运行记录、Agent 开发、设置。
- 中间：运行流水线，列为 `待分派`、`执行中`、`待审核`、`已完成`。
- 右侧：主 Agent 调度、路由队列、已选 Skills、活跃 Agents、快捷操作。
- 底部：实时事件流。

### 2.2 Session Detail

会话详情按 `02-session-execution-detail-cn.png` 实现：

- 左侧：工作区、目录结构、Agents、Skills。
- 中间：会话消息、任务分派、继续输入。
- 右侧：执行时间线、实时日志、产物、运行信息。

### 2.3 Agent Builder

Agent 开发页按 `04-custom-agent-builder-cn.png` 实现：

- 基本信息。
- CLI 类型。
- 模型和推理强度。
- Skills 选择。
- 工具权限。
- 调度策略。
- 实时配置预览。
- 测试运行。
- 保存 Agent。

---

## 3. Repository Layout

Create these directories under `E:\Codes\AgentPanels`:

```text
dashboard/
  frontend/
  backend/
  shared/
docs/
  prototypes/
  agent-dashboard-architecture.zh-CN.md
  agent-dashboard-development-plan.zh-CN.md
  agent-dashboard-development-decision.zh-CN.md
  agent-dashboard-usage.zh-CN.md
  agent-dashboard-usable-implementation-plan.zh-CN.md
one-code-cli/
```

`one-code-cli/` remains the dispatcher project. Do not place dashboard UI code inside `one-code-cli/`.

---

## 4. Shared Contracts

Create shared types first so frontend and backend do not drift.

**Files:**

- Create: `dashboard/shared/package.json`
- Create: `dashboard/shared/src/api.ts`
- Create: `dashboard/shared/src/dashboard.ts`
- Create: `dashboard/shared/src/occ.ts`
- Create: `dashboard/shared/src/index.ts`

### Task 4.1: Define API Response

- [ ] Create `dashboard/shared/src/api.ts` with:

```ts
export type ApiErrorSource = "frontend" | "backend" | "occ" | "child-cli" | "filesystem";

export type ApiError = {
  code: string;
  message: string;
  source: ApiErrorSource;
  details?: unknown;
};

export type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };

export type HealthResponse = {
  backend: "ok";
  occ: {
    available: boolean;
    path?: string;
    version?: string;
    doctorStatus?: "ok" | "warning" | "error";
    message?: string;
  };
};
```

### Task 4.2: Define Dashboard Models

- [ ] Create `dashboard/shared/src/dashboard.ts` with:

```ts
export type RunStatus = "queued" | "running" | "reviewing" | "success" | "failed" | "cancelled";

export type Workspace = {
  id: string;
  name: string;
  path: string;
  docRoot?: string;
  active: boolean;
  lastOpenedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type DashboardRun = {
  dashboardRunId: string;
  runId?: string;
  sessionId?: string;
  workspaceId: string;
  workspacePath: string;
  title: string;
  prompt: string;
  agent?: string;
  cli?: string;
  model?: string;
  effort?: string;
  status: RunStatus;
  resultPath?: string;
  metadataPath?: string;
  stdoutPath?: string;
  stderrPath?: string;
  commandPath?: string;
  startedAt?: string;
  finishedAt?: string;
  exitCode?: number;
  errorMessage?: string;
};

export type DashboardMessage = {
  id: string;
  sessionId: string;
  role: "user" | "main-agent" | "agent" | "system";
  agent?: string;
  runId?: string;
  content: string;
  createdAt: string;
};

export type DashboardSession = {
  sessionId: string;
  title: string;
  workspaceId: string;
  workspacePath: string;
  agent?: string;
  cli?: string;
  latestRunId?: string;
  updatedAt: string;
  messages: DashboardMessage[];
};

export type DashboardAgent = {
  name: string;
  aliases: string[];
  cli: string;
  model?: string;
  effort?: string;
  source: "builtin" | "config";
  envMode?: "inherit" | "strict";
  status?: "unknown" | "ready" | "missing" | "error";
};

export type DashboardSkill = {
  name: string;
  title?: string;
  description: string;
  source: "builtin" | "installed" | "project";
  enabled: boolean;
  path?: string;
};
```

### Task 4.3: Define Event Types

- [ ] Create `dashboard/shared/src/occ.ts` with:

```ts
export type DashboardEvent =
  | { type: "run.created"; dashboardRunId: string; at: string }
  | { type: "run.started"; dashboardRunId: string; at: string }
  | { type: "run.bound"; dashboardRunId: string; runId: string; at: string }
  | { type: "run.stdout"; dashboardRunId: string; chunk: string; at: string }
  | { type: "run.stderr"; dashboardRunId: string; chunk: string; at: string }
  | { type: "run.finished"; dashboardRunId: string; runId?: string; success: boolean; at: string }
  | { type: "workspace.changed"; workspaceId: string; at: string };

export type OccRunJson = {
  success: boolean;
  run_id: string;
  session_id: string;
  agent: string;
  cli: string;
  model?: string | null;
  model_source?: string;
  effort?: string | null;
  effort_source?: string;
  cwd: string;
  result_path: string;
  metadata_path: string;
  exit_code?: number | null;
  error?: {
    code: string;
    message: string;
  };
};
```

---

## 5. Backend Plan

### 5.1 Backend Foundation

**Files:**

- Create: `dashboard/backend/package.json`
- Create: `dashboard/backend/src/index.ts`
- Create: `dashboard/backend/src/config.ts`
- Create: `dashboard/backend/src/routes/health.ts`
- Create: `dashboard/backend/src/services/occ-runner.ts`
- Create: `dashboard/backend/src/services/path-utils.ts`

**Tasks:**

- [ ] Initialize Fastify server on `127.0.0.1`.
- [ ] Add `/api/health`.
- [ ] Implement `findOccExecutable()`.
- [ ] Implement `runOcc(args, options)`.
- [ ] Run `occ --version`.
- [ ] Run `occ doctor`.
- [ ] Return `HealthResponse`.

**Acceptance:**

```powershell
Invoke-RestMethod http://127.0.0.1:43110/api/health
```

Expected:

```json
{
  "ok": true,
  "data": {
    "backend": "ok",
    "occ": {
      "available": true
    }
  }
}
```

### 5.2 Workspace Store

**Files:**

- Create: `dashboard/backend/src/services/workspace-store.ts`
- Create: `dashboard/backend/src/routes/workspaces.ts`
- Create: `dashboard/backend/data/workspaces.json`

**Tasks:**

- [ ] Implement `GET /api/workspaces`.
- [ ] Implement `POST /api/workspaces`.
- [ ] Implement `PATCH /api/workspaces/:workspaceId`.
- [ ] Implement `POST /api/workspaces/:workspaceId/activate`.
- [ ] Validate path exists.
- [ ] Store JSON under `dashboard/backend/data/workspaces.json`.

**Acceptance:**

- Add `E:\Codes\AgentPanels\one-code-cli` as workspace.
- Refresh backend.
- Workspace remains available.

### 5.3 Agent Service

**Files:**

- Create: `dashboard/backend/src/services/agent-service.ts`
- Create: `dashboard/backend/src/routes/agents.ts`

**Tasks:**

- [ ] Implement `GET /api/agents` using `occ agents list`.
- [ ] Implement `GET /api/agents/:name` using `occ agents show <name>`.
- [ ] Implement `POST /api/agents/:name/test` using `occ agents test <name>`.
- [ ] Return parsed best-effort data even while `occ agents list` is table text.
- [ ] Preserve raw output in `details.raw` for debugging.

**Acceptance:**

- API returns builtin agents: `claude`, `codex`, `opencode`, `gemini`.
- If `occ` returns table text, backend still returns structured `DashboardAgent[]`.

### 5.4 Run Service

**Files:**

- Create: `dashboard/backend/src/services/run-store.ts`
- Create: `dashboard/backend/src/services/occ-artifacts.ts`
- Create: `dashboard/backend/src/routes/runs.ts`
- Create: `dashboard/backend/src/services/event-bus.ts`

**Tasks:**

- [ ] Implement `POST /api/runs`.
- [ ] Generate `dashboardRunId` before calling `occ`.
- [ ] Emit `run.created`.
- [ ] Spawn `occ run --output json --stream`.
- [ ] Capture stderr stream and emit `run.stderr` chunks.
- [ ] Capture stdout JSON at process completion.
- [ ] Bind `dashboardRunId` to `run_id`.
- [ ] Emit `run.bound`.
- [ ] Emit `run.finished`.
- [ ] Implement `GET /api/runs`.
- [ ] Implement `GET /api/runs/:runId`.
- [ ] Implement `GET /api/runs/:runId/result`.
- [ ] Implement `GET /api/runs/:runId/logs`.

**Important Runtime Rule:**

`run_id` is not guaranteed before `occ` completes. The dashboard must show running state using `dashboardRunId` and bind to `run_id` after JSON returns.

**Acceptance:**

- Creating a run shows a card immediately.
- The card changes to success or failed after `occ` exits.
- Result and logs can be opened after completion.

### 5.5 Session Service

**Files:**

- Create: `dashboard/backend/src/services/session-store.ts`
- Create: `dashboard/backend/src/routes/sessions.ts`
- Create: `dashboard/backend/data/messages.json`

**Tasks:**

- [ ] Implement `GET /api/sessions`.
- [ ] Read `~/.occ/sessions.sqlite` when available.
- [ ] Merge dashboard messages from `messages.json`.
- [ ] Implement `GET /api/sessions/:sessionId`.
- [ ] Implement `GET /api/sessions/:sessionId/messages`.
- [ ] Implement `POST /api/sessions/:sessionId/resume`.
- [ ] Resume by calling `occ run --session <sessionId> --resume --output json`.
- [ ] Store user follow-up message before calling `occ`.
- [ ] Store agent result summary after `occ` finishes.

**Acceptance:**

- User can open a session.
- User can continue a session.
- New run appears under the same session.

### 5.6 Skills Service

**Files:**

- Create: `dashboard/backend/src/services/skill-service.ts`
- Create: `dashboard/backend/src/routes/skills.ts`

**Tasks:**

- [ ] Implement `GET /api/skills` using `occ skills list`.
- [ ] Implement `GET /api/skills/:name` using `occ skills show <name>`.
- [ ] Implement `POST /api/skills/install` using `occ skills install`.
- [ ] Implement `POST /api/skills/:name/enable` as dashboard preference.
- [ ] Implement `POST /api/skills/:name/disable` as dashboard preference.

**Acceptance:**

- `using-one-code-cli` is visible.
- Skill detail shows `SKILL.md`.
- Install action calls `occ skills install`.

### 5.7 Reserved Routes

**Files:**

- Create: `dashboard/backend/src/routes/reserved.ts`

**Tasks:**

- [ ] Implement `POST /api/main-agent/plan` returning `501`.
- [ ] Implement `POST /api/main-agent/route` returning `501`.
- [ ] Implement `POST /api/runs/:runId/cancel` returning `501`.
- [ ] Implement `POST /api/plugins/install` returning `501`.
- [ ] Implement `GET /api/audit/events` returning empty array.
- [ ] Implement `POST /api/occ/daemon/connect` returning `501`.

**Acceptance:**

- Routes exist.
- Frontend can be wired without changing API shape later.

---

## 6. Frontend Plan

### 6.1 Frontend Foundation

**Files:**

- Create: `dashboard/frontend/package.json`
- Create: `dashboard/frontend/src/main.tsx`
- Create: `dashboard/frontend/src/App.tsx`
- Create: `dashboard/frontend/src/api/client.ts`
- Create: `dashboard/frontend/src/styles/global.css`

**Tasks:**

- [ ] Create Vite React app.
- [ ] Add global CSS matching prototype: light background, graphite text, teal primary color.
- [ ] Add API client.
- [ ] Fetch `/api/health`.
- [ ] Show backend/occ status in UI.

**Acceptance:**

- Frontend starts independently.
- It calls backend health API.
- No frontend file imports `child_process`.

### 6.2 App Shell

**Files:**

- Create: `dashboard/frontend/src/components/layout/AppShell.tsx`
- Create: `dashboard/frontend/src/components/layout/TopCommandBar.tsx`
- Create: `dashboard/frontend/src/components/layout/LeftNavigation.tsx`

**Tasks:**

- [ ] Implement top bar from prototype.
- [ ] Implement left navigation from prototype.
- [ ] Add nav items: `总览`、`工作区`、`Agents`、`Skills`、`会话`、`运行记录`、`Agent 开发`、`设置`.
- [ ] Add responsive layout constraints.

**Acceptance:**

- Screenshot resembles prototype shell.
- All labels are Chinese except product/agent names.

### 6.3 Home Dashboard

**Files:**

- Create: `dashboard/frontend/src/pages/HomePage.tsx`
- Create: `dashboard/frontend/src/components/workspace/WorkspaceSwitcher.tsx`
- Create: `dashboard/frontend/src/components/workspace/WorkspaceList.tsx`
- Create: `dashboard/frontend/src/components/runs/RunPipeline.tsx`
- Create: `dashboard/frontend/src/components/runs/RunColumn.tsx`
- Create: `dashboard/frontend/src/components/runs/RunCard.tsx`
- Create: `dashboard/frontend/src/components/runs/MainAgentSchedulerPanel.tsx`
- Create: `dashboard/frontend/src/components/runs/RealtimeEventStream.tsx`

**Tasks:**

- [ ] Render static layout matching `01-workspace-focused-dashboard-cn.png`.
- [ ] Load workspaces from backend.
- [ ] Load agents from backend.
- [ ] Submit task through `POST /api/runs`.
- [ ] Show running card using `dashboardRunId`.
- [ ] Update card when `run.finished` event arrives.
- [ ] Link finished card to run/session detail.

**Acceptance:**

- User can create a run.
- UI does not become cluttered with multiple workspaces.
- Current workspace remains the main focus.

### 6.4 Run Detail

**Files:**

- Create: `dashboard/frontend/src/pages/RunDetailPage.tsx`
- Create: `dashboard/frontend/src/components/artifacts/ArtifactPanel.tsx`
- Create: `dashboard/frontend/src/components/logs/LiveLogViewer.tsx`
- Create: `dashboard/frontend/src/components/artifacts/RunMetadataPanel.tsx`

**Tasks:**

- [ ] Fetch `GET /api/runs/:runId`.
- [ ] Fetch `GET /api/runs/:runId/result`.
- [ ] Fetch `GET /api/runs/:runId/logs`.
- [ ] Render tabs: `结果`、`标准输出`、`标准错误`、`运行信息`.
- [ ] Show missing result state when file is absent.

**Acceptance:**

- User can inspect run result and logs after completion.

### 6.5 Session Detail

**Files:**

- Create: `dashboard/frontend/src/pages/SessionDetailPage.tsx`
- Create: `dashboard/frontend/src/components/sessions/DirectoryTree.tsx`
- Create: `dashboard/frontend/src/components/sessions/ConversationPanel.tsx`
- Create: `dashboard/frontend/src/components/sessions/MessageBubble.tsx`
- Create: `dashboard/frontend/src/components/sessions/TaskComposer.tsx`
- Create: `dashboard/frontend/src/components/sessions/ExecutionTimeline.tsx`

**Tasks:**

- [ ] Render layout matching `02-session-execution-detail-cn.png`.
- [ ] Load session from backend.
- [ ] Load messages from backend.
- [ ] Show directory tree for active workspace through backend API.
- [ ] Show logs, artifacts, run metadata on right panel.
- [ ] Submit follow-up through `POST /api/sessions/:sessionId/resume`.

**Acceptance:**

- User can open a session and continue it.
- Page shows directory, conversation, timeline, logs, artifacts.

### 6.6 Agents, Skills, Builder

**Files:**

- Create: `dashboard/frontend/src/pages/AgentsPage.tsx`
- Create: `dashboard/frontend/src/pages/SkillsPage.tsx`
- Create: `dashboard/frontend/src/pages/AgentBuilderPage.tsx`
- Create: `dashboard/frontend/src/components/agents/AgentList.tsx`
- Create: `dashboard/frontend/src/components/agents/AgentBuilderForm.tsx`
- Create: `dashboard/frontend/src/components/skills/SkillList.tsx`
- Create: `dashboard/frontend/src/components/skills/SkillDetail.tsx`

**Tasks:**

- [ ] Agents page loads `GET /api/agents`.
- [ ] Agent test button calls `POST /api/agents/:name/test`.
- [ ] Skills page loads `GET /api/skills`.
- [ ] Skill detail loads `GET /api/skills/:name`.
- [ ] Skill install calls `POST /api/skills/install`.
- [ ] Agent Builder matches `04-custom-agent-builder-cn.png`.
- [ ] Agent Builder saves through `POST /api/agents`.

**Acceptance:**

- User can view and test agents.
- User can view and install skills.
- User can create a basic custom agent through `occ agents add`.

---

## 7. `one-code-cli` Enhancement Plan

These changes are not required before M1/M2, but are required for a polished usable product.

**Files likely affected inside `one-code-cli/`:**

- `src/cli.rs`
- `src/commands/runs.rs`
- `src/commands/sessions.rs`
- `src/commands/profiles.rs`
- `src/commands/skills_cmd.rs`
- `src/documents.rs`
- `src/runner.rs`
- `src/output.rs`

### Enhancement 7.1: JSON List Outputs

- [ ] Add `--output json` to `occ runs list`.
- [ ] Add `--output json` to `occ sessions list`.
- [ ] Add `--output json` to `occ agents list`.
- [ ] Add `--output json` to `occ skills list`.

**Acceptance:**

- Dashboard backend stops parsing tables.

### Enhancement 7.2: Early Run Event

- [ ] Emit `run_started` event when run directory is created.
- [ ] Include `run_id`, `session_id`, `run_dir`, `stdout_log`, `stderr_log`.
- [ ] Make event available on stdout/stderr or `events.jsonl`.

**Acceptance:**

- Dashboard can tail logs before `occ` exits.

### Enhancement 7.3: Agent Update

- [ ] Add `occ agents update <name>`.
- [ ] Support model, effort, aliases, env, config_dir updates.

**Acceptance:**

- Agent Builder can edit agents without direct config writes.

### Enhancement 7.4: Run Cancel

- [ ] Add cancellable process registry or documented cancellation strategy.
- [ ] Add `occ run cancel <run_id>` or daemon-based cancellation.

**Acceptance:**

- Dashboard cancel button can become functional.

---

## 8. Milestones to Usable

### M0: Design Lock

**Goal:** Freeze product boundaries.

- [ ] Confirm prototype images.
- [ ] Confirm this implementation plan.
- [ ] Confirm architecture doc.
- [ ] Confirm decision doc.

**Usable value:** Development no longer drifts.

### M1: Static UI + Backend Health

**Goal:** See the product shell and prove frontend/backend separation.

- [ ] Frontend shell.
- [ ] Backend health.
- [ ] `occ --version`.
- [ ] `occ doctor`.
- [ ] Prototype-based screenshot.

**Usable value:** The app opens and tells whether `occ` works.

### M2: Run MVP

**Goal:** Delegate a task through `occ`.

- [ ] Workspace list.
- [ ] Agent list.
- [ ] Create run.
- [ ] Show run card.
- [ ] Show result and logs.

**Usable value:** User can actually use the dashboard to run a task.

### M3: Session Usability

**Goal:** Open and continue sessions.

- [ ] Session detail page.
- [ ] Conversation messages.
- [ ] Resume session.
- [ ] Execution timeline.
- [ ] Artifacts panel.

**Usable value:** User can continue real work instead of isolated one-off runs.

### M4: Agent and Skill Usability

**Goal:** Manage execution capabilities.

- [ ] Agents page.
- [ ] Agent test.
- [ ] Skills page.
- [ ] Skill install.
- [ ] Agent Builder create flow.

**Usable value:** User can configure their own execution environment.

### M5: Multi-Workspace Usability

**Goal:** Manage several workspaces without clutter.

- [ ] Workspace tabs.
- [ ] Global view.
- [ ] Cross-workspace event stream.
- [ ] Workspace-level status summaries.

**Usable value:** User can keep multiple codebases under one dashboard.

### M6: Reliability and Diagnostics

**Goal:** Make failures understandable.

- [ ] Diagnostics page.
- [ ] `occ` missing state.
- [ ] CLI missing state.
- [ ] Agent test failure state.
- [ ] Result missing state.
- [ ] Logs with raw stderr expansion.

**Usable value:** User can fix setup issues without reading source code.

### M7: Packaged Local Tool

**Goal:** Make it easy to start and use repeatedly.

- [ ] Add root scripts to start frontend and backend.
- [ ] Add `README` for local startup.
- [ ] Persist workspaces.
- [ ] Persist dashboard messages.
- [ ] Consider Tauri wrapper.

**Usable value:** User can use it as a daily local tool.

---

## 9. Testing Strategy

### 9.1 Unit Tests

- [ ] Test `parseOccRunJson`.
- [ ] Test `parseOccAgentsTable`.
- [ ] Test `cleanDisplayPath`.
- [ ] Test workspace store.
- [ ] Test run store status transitions.

### 9.2 Integration Tests

- [ ] Backend health with fake `occ`.
- [ ] Run creation with mock agent.
- [ ] Failed run with mock agent.
- [ ] Agent list parsing.
- [ ] Skill list parsing.

### 9.3 UI Tests

- [ ] Home page renders all required prototype regions.
- [ ] Run card appears after submit.
- [ ] Run detail shows result/logs.
- [ ] Session page shows left directory, center conversation, right logs.
- [ ] Agent Builder shows preview and test panel.

### 9.4 End-to-End Test

Use a mock Agent through `occ`:

1. Start backend.
2. Start frontend.
3. Add workspace.
4. Select mock Agent.
5. Submit task.
6. Wait for run completion.
7. Open result.
8. Open session.
9. Resume session.
10. Verify second run appears.

---

## 10. Key Risks and Decisions

### Risk 10.1: `run_id` is known too late

Mitigation:

- Use `dashboardRunId` while running.
- Bind `run_id` after `occ` JSON returns.
- Later enhance `occ` with `run_started`.

### Risk 10.2: Table parsing is fragile

Mitigation:

- Keep raw output in API details.
- Add JSON output to `occ` in M5/M6.

### Risk 10.3: Agent editing can bypass `occ`

Mitigation:

- First version only creates agents with `occ agents add`.
- Editing waits for `occ agents update`.

### Risk 10.4: UI becomes too dense

Mitigation:

- Default view focuses current workspace.
- Global view is separate.
- Use prototype screenshot checks.

### Risk 10.5: User environment is not ready

Mitigation:

- Health page.
- Diagnostics panel.
- Clear setup errors.
- Mock agent support for development.

---

## 11. Recommended Immediate Next Step

Start with M1, not M2.

The first pull request should only create:

```text
dashboard/shared
dashboard/backend
dashboard/frontend
```

And deliver:

- API types.
- Backend health endpoint.
- `occ --version` and `occ doctor`.
- Frontend shell matching the dashboard prototype.
- No real task execution yet.

This gives a stable foundation and prevents the UI, API, and dispatcher integration from getting tangled too early.
