# Agent 看板前后端分离开发计划

> **执行要求：** 本计划必须基于图片原型开发，必须前后端分离，必须预留扩展接口，所有 Agent 操作、任务分派、会话恢复、Agent/Skill 管理都必须通过 `one-code-cli` 项目里的 `occ` 能力完成。看板不能绕过 `occ` 直接调用 Claude、Codex、opencode、Gemini 等底层 CLI。

**目标：** 基于图片原型开发一个中文 Agent 看板。前端负责看板、会话、日志、目录、Agents、Skills 和 Agent 开发体验；后端负责提供稳定 API、调用 `occ`、读取 `occ` 产物并整理成前端需要的数据；`one-code-cli` / `occ` 保持为唯一调度员和操作工具。

**架构：** 采用前后端分离架构：`dashboard/frontend` 是纯 UI 应用，通过 HTTP/WebSocket/SSE 调用后端；`dashboard/backend` 是本地 API 服务，只通过 `occ` 命令和 `occ` 产物目录完成操作。后续可把后端调用方式从 spawn `occ` 平滑替换为 `occ daemon` 或 Rust library，但接口形态先稳定下来。

**技术栈建议：** 前端使用 React / Next.js / Vite 均可，后端使用 Node.js 或 Rust 均可；第一版推荐 Node.js 后端便于快速封装 CLI、文件 tail、SQLite 读取。运行时核心仍是 `one-code-cli` 的 `occ`。

---

## 1. 硬性约束

### 1.1 必须看图片开发

开发前必须打开上层项目里的原型图片。当前计划按 `E:\Codes\AgentPanels\docs\prototypes` 下的图片作为 UI 基准：

- `prototypes/01-workspace-focused-dashboard-cn.png`
- `prototypes/02-session-execution-detail-cn.png`
- `prototypes/03-workspace-skills-agents-cn.png`
- `prototypes/04-custom-agent-builder-cn.png`
- `prototypes/agent-dashboard-cn-prototype.png`

这些图片属于上层 `AgentPanels` 产品设计资料，不属于 `one-code-cli`。开发看板时必须以这些图片为视觉验收基准。

图片验收要求：

- 首页必须接近 `01-workspace-focused-dashboard-cn.png`：当前工作区优先、左侧导航、运行流水线、右侧主 Agent 调度、底部事件流。
- 会话页必须接近 `02-session-execution-detail-cn.png`：左侧目录结构，中间对话，右侧执行时间线、日志、产物和运行信息。
- Agents / Skills / Agent 开发必须参考后续原型，不允许临时做成简单表格页了事。
- UI 必须全中文。
- UI 不使用紫色主色。
- 不做营销页，打开就是工具。

### 1.2 必须前后端分离

前端不能直接执行 `occ`，也不能直接读取用户磁盘上的 `~/.occ`、workspace 文件或 SQLite。前端只能调用后端 API。

后端负责：

- 执行 `occ`。
- 读取 `occ` 产物。
- 读取 `occ` 会话库。
- 管理看板自己的 workspace、消息、运行状态缓存。
- 对前端屏蔽 Windows 路径、编码、进程、日志 tail 等细节。

前端负责：

- 页面和交互。
- 状态展示。
- 任务输入。
- 日志和产物可视化。
- Agent / Skill / 工作区管理界面。

### 1.3 必须预留接口

第一版即使不实现全部功能，也必须预留接口形态，避免后续重构。

必须预留：

- 主 Agent 调度接口。
- 自定义 Agent 开发接口。
- Skills 选择和绑定接口。
- 多工作区全局视图接口。
- 运行取消接口。
- 运行事件订阅接口。
- 未来 `occ daemon` 接口。
- 未来插件/扩展接口。
- 未来权限和审计接口。

### 1.4 操作工具必须是 `one-code-cli`

所有会改变状态或触发任务的动作必须走 `occ`：

- 新建任务：`occ run`
- 多 Agent 分派：`occ run --agents`
- 继续会话：`occ run --session ... --resume`
- Agent 列表/详情/测试：`occ agents ...`
- Agent 配置：优先使用 `occ agents add` 和 `occ config/settings` 能力；缺失能力再规划补齐 `occ` 命令，不能绕过直接写底层 CLI。
- Skill 列表/安装/查看：`occ skills ...`
- 配置检查：`occ doctor`、`occ config validate`

允许后端直接读取的内容仅限 `occ` 已生成的结构化产物：

- `<doc_root>/index.jsonl`
- `<doc_root>/runs/<run_id>/*`
- `~/.occ/sessions.sqlite`
- `~/.occ/config.toml`
- `~/.agents/skills`

后端可以读取这些文件用于展示，但执行动作仍以 `occ` 为入口。

---

## 2. 图片对应的产品范围

### 2.1 首页：工作区聚焦看板

对应图片：

```text
prototypes/01-workspace-focused-dashboard-cn.png
prototypes/agent-dashboard-cn-prototype.png
```

页面目标：

- 一个看板能管理多个工作区。
- 默认只聚焦当前工作区，避免过乱。
- 多工作区通过顶部切换器、左侧工作区列表和全局视图入口体现。
- 中间是运行流水线，不是普通任务列表。
- 右侧是主 Agent 调度区，展示路由队列、Skills、活跃 Agents 和快捷操作。

必须实现的 UI 区块：

- 顶部命令栏。
- 当前工作区切换器。
- 全局视图按钮。
- 任务输入框。
- `分派` 按钮。
- 左侧导航：`总览`、`工作区`、`Agents`、`Skills`、`会话`、`运行记录`、`Agent 开发`、`设置`。
- 工作区列表。
- 运行流水线：`待分派`、`执行中`、`待确认`、`已完成`。
- 主 Agent 调度面板。
- 实时事件流。

### 2.2 会话执行详情页

对应图片：

```text
prototypes/02-session-execution-detail-cn.png
```

页面目标：

- 用户可以从运行卡片打开对应会话。
- 打开后能看到对话、执行过程、目录结构、日志、产物和运行信息。
- 页面支持继续输入，让主 Agent 调整分派或继续执行。

必须实现的 UI 区块：

- 顶部会话栏：当前工作区、会话标题、返回看板、全局视图。
- 多工作区标签。
- 左侧目录结构。
- 左侧 Agents 小列表。
- 左侧 Skills 小列表。
- 中间会话消息。
- 中间 tabs：`对话`、`执行过程`、`结果`。
- 底部输入框。
- 右侧执行时间线。
- 右侧实时日志：`标准输出`、`标准错误`、`事件`。
- 右侧产物：`result.md`、`diff.patch`、日志目录。
- 右侧运行信息。

### 2.3 Agents / Skills / Agent 开发

对应图片：

```text
prototypes/03-workspace-skills-agents-cn.png
prototypes/04-custom-agent-builder-cn.png
```

页面目标：

- `Skills` 是一级产品概念，不放在设置深处。
- `Agent 开发` 是明确入口，用户可以创建自己的 Agent。
- 自定义 Agent 最终必须落到 `one-code-cli` 的 Agent 配置模型。

必须实现：

- Agents 列表。
- Agent 详情。
- Agent 测试。
- Skill 列表。
- Skill 详情。
- Skill 安装。
- Agent 创建表单。
- Agent TOML 预览。
- `occ agents test` 验证入口。

---

## 3. 前后端分离架构

### 3.1 目录结构

建议在上层 `AgentPanels` 项目内新增看板应用目录，`one-code-cli` 保持为底层调度员源码目录：

```text
dashboard/
  frontend/
    package.json
    src/
      app/
        page.tsx
        sessions/[sessionId]/page.tsx
        agents/page.tsx
        skills/page.tsx
        agent-builder/page.tsx
        settings/page.tsx
      components/
        layout/
        workspace/
        runs/
        sessions/
        agents/
        skills/
        logs/
        artifacts/
      api-client/
        client.ts
        runs.ts
        sessions.ts
        agents.ts
        skills.ts
        workspaces.ts
      styles/
      types/
  backend/
    package.json
    src/
      index.ts
      config.ts
      routes/
        health.ts
        workspaces.ts
        runs.ts
        sessions.ts
        agents.ts
        skills.ts
        events.ts
        reserved.ts
      services/
        occ-runner.ts
        occ-artifacts.ts
        workspace-store.ts
        run-store.ts
        session-store.ts
        agent-service.ts
        skill-service.ts
        event-bus.ts
      types/
        api.ts
        occ.ts
        dashboard.ts
      tests/
```

### 3.2 前端职责

前端只能做这些事情：

- 调用后端 API。
- 渲染页面。
- 管理 UI 状态。
- 展示日志、结果、事件和产物。
- 提交用户操作。

前端禁止：

- 直接 spawn `occ`。
- 直接调用 Claude/Codex/opencode/Gemini。
- 直接读取本机路径。
- 直接写 `~/.occ/config.toml`。
- 直接读 SQLite。

### 3.3 后端职责

后端只通过 `occ` 和 `occ` 产物工作：

- `occ-runner` 负责执行 `occ`。
- `occ-artifacts` 负责读取 run 目录。
- `workspace-store` 保存看板自己的工作区列表。
- `run-store` 保存运行中的临时状态。
- `session-store` 保存看板消息流，并读取 `~/.occ/sessions.sqlite`。
- `agent-service` 包装 `occ agents` 和 `occ config`。
- `skill-service` 包装 `occ skills` 和本地 skills 目录。
- `event-bus` 给前端推送运行状态和日志事件。

---

## 4. API 设计

所有 API 返回结构统一：

```ts
type ApiResponse<T> = {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
};
```

### 4.1 健康检查

```http
GET /api/health
```

返回：

```ts
type HealthResponse = {
  backend: "ok";
  occ: {
    available: boolean;
    path?: string;
    version?: string;
    doctorStatus?: "ok" | "warning" | "error";
  };
};
```

后端实现必须调用：

```powershell
occ --version
occ doctor
```

### 4.2 工作区接口

```http
GET /api/workspaces
POST /api/workspaces
PATCH /api/workspaces/:workspaceId
DELETE /api/workspaces/:workspaceId
POST /api/workspaces/:workspaceId/activate
```

预留字段：

```ts
type Workspace = {
  id: string;
  name: string;
  path: string;
  docRoot?: string;
  active: boolean;
  lastOpenedAt?: string;
  reserved?: {
    remoteUrl?: string;
    branch?: string;
    tags?: string[];
  };
};
```

### 4.3 运行接口

```http
GET /api/runs?workspaceId=...
POST /api/runs
GET /api/runs/:runId
GET /api/runs/:runId/result
GET /api/runs/:runId/logs?type=stdout|stderr|merged
GET /api/runs/:runId/events
POST /api/runs/:runId/cancel
```

`POST /api/runs` 请求：

```ts
type CreateRunRequest = {
  workspaceId: string;
  prompt: string;
  agent?: string;
  cli?: string;
  agents?: string[];
  skills?: string[];
  model?: string;
  effort?: string;
  sessionId?: string;
  resume?: boolean;
  reserved?: {
    priority?: "low" | "normal" | "high";
    requiresReview?: boolean;
    labels?: string[];
    plannedAgentGraph?: unknown;
  };
};
```

后端必须转换为 `occ` 命令：

```powershell
occ run `
  --agent <agent> `
  --cwd <workspacePath> `
  --prompt <prompt> `
  --non-interactive `
  --stream `
  --output json
```

多 Agent 时：

```powershell
occ run `
  --agents <agent1,agent2> `
  --cwd <workspacePath> `
  --prompt <prompt> `
  --non-interactive `
  --stream `
  --output json
```

继续会话时：

```powershell
occ run `
  --session <sessionId> `
  --resume `
  --prompt <prompt> `
  --non-interactive `
  --stream `
  --output json
```

`POST /api/runs/:runId/cancel` 第一版可返回 `not_implemented`，但接口必须保留。

### 4.4 会话接口

```http
GET /api/sessions?workspaceId=...
GET /api/sessions/:sessionId
GET /api/sessions/:sessionId/runs
GET /api/sessions/:sessionId/messages
POST /api/sessions/:sessionId/messages
POST /api/sessions/:sessionId/resume
```

预留字段：

```ts
type DashboardSession = {
  sessionId: string;
  title: string;
  workspaceId: string;
  workspacePath: string;
  agent: string;
  cli: string;
  latestRunId?: string;
  updatedAt: string;
  messages: DashboardMessage[];
  reserved?: {
    parentSessionId?: string;
    sharedContextId?: string;
    reviewState?: "none" | "pending" | "approved" | "rejected";
  };
};
```

### 4.5 Agents 接口

```http
GET /api/agents
GET /api/agents/:name
POST /api/agents
PATCH /api/agents/:name
POST /api/agents/:name/test
POST /api/agents/:name/set-default
```

后端必须优先调用：

```powershell
occ agents list
occ agents show <name>
occ agents test <name>
occ agents add ...
occ config validate
```

如果某些编辑能力 `occ` 当前没有命令支持，计划里必须新增 `occ` 命令任务，不能让看板后端直接绕过 `occ` 修改底层 CLI 配置。

预留字段：

```ts
type DashboardAgent = {
  name: string;
  aliases: string[];
  cli: "claude" | "codex" | "opencode" | "gemini" | string;
  model?: string;
  effort?: string;
  source: "builtin" | "config";
  envMode?: "inherit" | "strict";
  status?: "unknown" | "ready" | "missing" | "error";
  reserved?: {
    icon?: string;
    color?: string;
    capabilities?: string[];
    defaultSkills?: string[];
    routingWeight?: number;
  };
};
```

### 4.6 Skills 接口

```http
GET /api/skills
GET /api/skills/:name
POST /api/skills/install
POST /api/skills/:name/enable
POST /api/skills/:name/disable
```

后端必须优先调用：

```powershell
occ skills list
occ skills show <name>
occ skills install
occ skills doctor
```

预留字段：

```ts
type DashboardSkill = {
  name: string;
  title?: string;
  description: string;
  source: "builtin" | "installed" | "project";
  enabled: boolean;
  path?: string;
  reserved?: {
    compatibleAgents?: string[];
    requiredTools?: string[];
    version?: string;
    marketplaceId?: string;
  };
};
```

### 4.7 事件订阅接口

```http
GET /api/events/stream
GET /api/runs/:runId/stream
```

第一版可以用 SSE，后续可升级 WebSocket。

事件类型：

```ts
type DashboardEvent =
  | { type: "run.created"; runId: string; at: string }
  | { type: "run.started"; runId: string; at: string }
  | { type: "run.stdout"; runId: string; chunk: string; at: string }
  | { type: "run.stderr"; runId: string; chunk: string; at: string }
  | { type: "run.finished"; runId: string; success: boolean; at: string }
  | { type: "workspace.changed"; workspaceId: string; at: string };
```

### 4.8 预留接口

这些接口第一版可以返回 `501 not_implemented`，但路由和类型要先定义：

```http
POST /api/main-agent/plan
POST /api/main-agent/route
GET /api/main-agent/queue
POST /api/plugins/install
GET /api/plugins
POST /api/reviews/:runId/approve
POST /api/reviews/:runId/reject
GET /api/audit/events
POST /api/occ/daemon/connect
```

---

## 5. 数据模型

### 5.1 Run

```ts
type DashboardRun = {
  runId: string;
  sessionId: string;
  workspaceId: string;
  workspacePath: string;
  title: string;
  prompt: string;
  agent: string;
  cli: string;
  model?: string;
  effort?: string;
  status: "queued" | "running" | "reviewing" | "success" | "failed" | "cancelled";
  resultPath?: string;
  metadataPath?: string;
  stdoutPath?: string;
  stderrPath?: string;
  commandPath?: string;
  startedAt?: string;
  finishedAt?: string;
  exitCode?: number;
  occ: {
    rawResponse?: unknown;
    command?: string[];
    docRoot?: string;
  };
  reserved?: {
    reviewRequired?: boolean;
    parentBatchId?: string;
    agentGraphNodeId?: string;
  };
};
```

### 5.2 Message

```ts
type DashboardMessage = {
  id: string;
  sessionId: string;
  role: "user" | "main-agent" | "agent" | "system";
  agent?: string;
  runId?: string;
  content: string;
  createdAt: string;
  reserved?: {
    attachments?: string[];
    toolCalls?: unknown[];
    reviewState?: string;
  };
};
```

### 5.3 Artifact

```ts
type DashboardArtifact = {
  id: string;
  runId: string;
  name: string;
  kind: "result" | "stdout" | "stderr" | "event" | "metadata" | "command" | "file";
  path: string;
  size?: number;
  updatedAt?: string;
};
```

---

## 6. 页面开发计划

### 6.1 首页

路径：

```text
/
```

必须按图片实现的组件：

- `AppShell`
- `TopCommandBar`
- `WorkspaceSwitcher`
- `LeftNavigation`
- `WorkspaceList`
- `RunPipeline`
- `RunColumn`
- `RunCard`
- `MainAgentSchedulerPanel`
- `SkillChips`
- `ActiveAgentList`
- `RealtimeEventStream`

验收：

- 截图与 `01-workspace-focused-dashboard-cn.png` 的信息架构一致。
- 当前工作区是主焦点。
- 运行流水线是中间主区域。
- 左侧包含 `Agents`、`Skills`、`Agent 开发`。
- 右侧包含 `主 Agent 调度`。
- 底部包含实时事件流。

### 6.2 会话详情页

路径：

```text
/sessions/:sessionId
```

必须按图片实现的组件：

- `SessionTopBar`
- `WorkspaceTabs`
- `DirectoryTree`
- `AgentMiniList`
- `SkillMiniList`
- `ConversationPanel`
- `ConversationTabs`
- `MessageBubble`
- `TaskComposer`
- `ExecutionTimeline`
- `LiveLogViewer`
- `ArtifactPanel`
- `RunMetadataPanel`

验收：

- 截图与 `02-session-execution-detail-cn.png` 的布局一致。
- 左侧能看目录结构。
- 中间能看对话和分派。
- 右侧能看执行时间线、日志、产物和运行信息。
- 能继续会话，继续动作通过后端调用 `occ run --session ... --resume`。

### 6.3 Agents 页面

路径：

```text
/agents
```

必须实现：

- Agent 列表。
- Agent 状态。
- Agent 详情抽屉。
- `occ agents test` 按钮。
- 跳转 `Agent 开发`。

### 6.4 Skills 页面

路径：

```text
/skills
```

必须实现：

- Skills 列表。
- Skill 详情。
- 安装 Skills。
- 启用/禁用入口。
- 在分派任务时选择 Skills。

### 6.5 Agent 开发页面

路径：

```text
/agent-builder
```

必须实现：

- 选择 CLI 类型。
- 设置名称、alias、model、effort。
- 设置环境变量和 config_dir。
- TOML 预览。
- 保存前测试。
- 保存动作通过 `occ agents add` 或后续新增的 `occ agents update` 完成。

---

## 7. 分阶段实施

### 阶段 0：原型确认和工程骨架

目标：确保图片、前端、后端、`occ` 调用链都准备好。

- [ ] 确认 `E:\Codes\AgentPanels\docs\prototypes` 存在。
- [ ] 打开并确认 5 张原型图片。
- [ ] 创建 `dashboard/frontend`。
- [ ] 创建 `dashboard/backend`。
- [ ] 定义共享 API 类型。
- [ ] 后端实现 `GET /api/health`。
- [ ] 后端实现 `occ` 可执行文件定位。
- [ ] 后端实现 `occ --version` 和 `occ doctor` 探针。
- [ ] 前端实现静态壳子，按图片摆出首页布局。
- [ ] 前端所有数据先走后端 mock API，不直接读本地文件。

验收：

- 前后端分别启动。
- 前端通过 API 读取健康状态。
- 首页静态布局与图片方向一致。
- 后端能找到并调用 `occ`。

### 阶段 1：MVP 分派闭环

目标：完成“工作区 -> Agent -> 任务 -> occ run -> 结果”的闭环。

- [ ] 后端实现 `GET /api/workspaces`。
- [ ] 后端实现 `POST /api/workspaces`。
- [ ] 后端实现 `GET /api/agents`，内部调用 `occ agents list`。
- [ ] 后端实现 `POST /api/runs`，内部调用 `occ run --output json`。
- [ ] 后端实现 run 产物读取。
- [ ] 后端实现 `GET /api/runs/:runId/result`。
- [ ] 后端实现 `GET /api/runs/:runId/logs`。
- [ ] 前端实现工作区切换。
- [ ] 前端实现 Agent 选择。
- [ ] 前端实现顶部任务输入。
- [ ] 前端实现运行卡片。
- [ ] 前端实现运行详情入口。

验收：

- 用户能从首页分派任务。
- 后端实际执行的是 `occ run`。
- 前端能看到执行中和完成状态。
- 打开详情能看到 result 和日志。

### 阶段 2：会话执行详情

目标：按图片完成会话详情页。

- [ ] 后端实现 `GET /api/sessions`。
- [ ] 后端实现 `GET /api/sessions/:sessionId`。
- [ ] 后端实现看板消息存储。
- [ ] 后端实现 `POST /api/sessions/:sessionId/resume`，内部调用 `occ run --session ... --resume`。
- [ ] 后端实现 `GET /api/runs/:runId/events`。
- [ ] 前端实现会话详情页面。
- [ ] 前端实现目录结构展示。
- [ ] 前端实现执行时间线。
- [ ] 前端实现实时日志 tabs。
- [ ] 前端实现产物面板。
- [ ] 前端实现继续会话输入框。

验收：

- 从首页运行卡片进入会话详情。
- 页面结构与会话原型图片一致。
- 继续会话只通过后端调用 `occ`。

### 阶段 3：Agents / Skills / Agent 开发

目标：按图片补齐管理能力。

- [ ] 后端实现 `GET /api/agents/:name`，内部调用 `occ agents show`。
- [ ] 后端实现 `POST /api/agents/:name/test`，内部调用 `occ agents test`。
- [ ] 后端实现 `POST /api/agents`，内部调用 `occ agents add`。
- [ ] 后端预留 `PATCH /api/agents/:name`。
- [ ] 后端实现 `GET /api/skills`，内部调用 `occ skills list`。
- [ ] 后端实现 `GET /api/skills/:name`，内部调用 `occ skills show`。
- [ ] 后端实现 `POST /api/skills/install`，内部调用 `occ skills install`。
- [ ] 前端实现 Agents 页面。
- [ ] 前端实现 Skills 页面。
- [ ] 前端实现 Agent 开发页面。
- [ ] 前端实现 TOML 预览和测试反馈。

验收：

- 用户能查看、测试和新增 Agent。
- 用户能查看和安装 Skills。
- 所有操作动作都经过后端，再由后端调用 `occ`。

### 阶段 4：多工作区和全局视图

目标：一个看板看多个工作区，但默认不乱。

- [ ] 后端按 workspace 聚合 runs。
- [ ] 后端按 workspace 聚合 sessions。
- [ ] 后端实现 `GET /api/events/stream`。
- [ ] 后端实现 `GET /api/main-agent/queue` 预留队列接口。
- [ ] 前端实现全局视图入口。
- [ ] 前端实现多工作区标签。
- [ ] 前端实现跨工作区事件流。
- [ ] 前端支持从全局视图跳回具体工作区。

验收：

- 默认首页仍聚焦当前工作区。
- 全局视图能看到多个工作区的运行中、失败、待确认数量。
- 信息密度不能回到过乱版本。

### 阶段 5：增强 `one-code-cli`

目标：让 `occ` 更适合看板接入，但仍保持它是唯一操作工具。

- [ ] 给 `occ runs list` 增加 `--output json`。
- [ ] 给 `occ sessions list` 增加 `--output json`。
- [ ] 给 `occ agents list` 增加 `--output json`。
- [ ] 给 `occ skills list` 增加 `--output json`。
- [ ] 给 `occ` 增加更多 `events.jsonl` 事件。
- [ ] 增加 `occ agents update`。
- [ ] 增加 `occ run cancel` 或等价取消能力。
- [ ] 评估 `occ daemon`。

验收：

- Dashboard 后端不再解析表格文本。
- 运行过程可以由结构化事件驱动。
- Agent 编辑动作也能通过 `occ` 命令完成。

---

## 8. 状态设计

| 看板状态 | 来源 | 说明 |
| --- | --- | --- |
| `queued` | 后端创建任务但还未 spawn `occ` | 等待调度 |
| `running` | 后端已 spawn `occ` | 执行中 |
| `reviewing` | `occ` 成功但看板要求人工确认 | 待确认 |
| `success` | `occ` 返回 `success=true` | 完成 |
| `failed` | `occ` 返回 `success=false` 或进程错误 | 失败 |
| `cancelled` | 预留取消接口 | 已取消 |

状态来源规则：

- `queued`、`running`、`cancelled` 由后端维护。
- `success`、`failed` 必须来自 `occ` 返回值或 `run.toml`。
- 前端不能自行判定底层任务成功。

---

## 9. 测试计划

### 9.1 图片还原测试

- [ ] 用 Playwright 截图首页。
- [ ] 对照 `01-workspace-focused-dashboard-cn.png` 检查区域是否齐全。
- [ ] 用 Playwright 截图会话页。
- [ ] 对照 `02-session-execution-detail-cn.png` 检查区域是否齐全。
- [ ] 检查全中文。
- [ ] 检查未使用紫色主色。

### 9.2 前后端分离测试

- [ ] 前端源码中不能出现 `child_process`。
- [ ] 前端源码中不能出现 `occ run`。
- [ ] 前端源码中不能直接读取 `~/.occ`。
- [ ] 所有页面数据必须来自 `/api/*`。
- [ ] 后端 API 断开时，前端显示中文错误状态。

### 9.3 `occ` 工具链测试

- [ ] mock agent 成功运行。
- [ ] mock agent 失败运行。
- [ ] 多 Agent 分派返回 `batch_id`。
- [ ] resume 调用走 `occ run --session ... --resume`。
- [ ] Agent 测试走 `occ agents test`。
- [ ] Skills 安装走 `occ skills install`。
- [ ] `occ` 不存在时返回清晰错误。

### 9.4 端到端测试

完整闭环：

1. 启动后端。
2. 启动前端。
3. 打开首页。
4. 添加工作区。
5. 选择 Agent。
6. 输入任务。
7. 后端调用 `occ run`。
8. 首页出现运行卡片。
9. 打开会话详情。
10. 查看目录、对话、日志、产物、运行信息。
11. 继续会话。
12. 后端调用 `occ run --session ... --resume`。

---

## 10. 错误处理

必须处理：

- 原型图片缺失。
- 前端无法连接后端。
- 后端找不到 `occ`。
- `occ doctor` 返回异常。
- 工作区路径不存在。
- Agent 不存在。
- Skill 不存在。
- 底层 CLI 未安装。
- `occ run` 返回非 JSON。
- `occ run` 子进程失败。
- `result.md` 缺失。
- 日志文件编码异常。
- Windows 路径带 `\\?\`。
- resume 出现 `session_agent_mismatch`。
- resume 出现 `resume_unsupported`。

错误展示要求：

- 用户提示用中文。
- 保留 `occ` 原始错误码。
- 详情里可以展开原始 stderr。

---

## 11. 里程碑

### M1：前后端骨架和图片静态还原

交付：

- `dashboard/frontend`。
- `dashboard/backend`。
- 健康检查 API。
- 首页静态还原。
- 会话页静态还原。

### M2：`occ run` MVP

交付：

- 工作区管理。
- Agent 读取。
- 任务分派。
- 运行卡片。
- result 和日志查看。

### M3：会话执行详情

交付：

- 会话列表。
- 会话详情。
- 执行时间线。
- 继续会话。
- 产物面板。

### M4：Agents / Skills / Agent 开发

交付：

- Agents 页面。
- Skills 页面。
- Agent 开发页面。
- 所有操作通过 `occ`。

### M5：多工作区和预留能力接线

交付：

- 全局视图。
- 事件订阅。
- 预留接口返回稳定结构。
- `occ` JSON 输出增强计划进入实施。

---

## 12. 第一版不做

第一版不做这些：

- 不直接调用 Claude/Codex/opencode/Gemini。
- 不把前后端写在一起。
- 不让前端读写本地文件。
- 不做云端多租户。
- 不做远程协作。
- 不做完整 IDE。
- 不做插件市场。
- 不绕过 `occ` 写底层 CLI 配置。

---

## 13. 下一步

下一步先做 M1：

1. 打开并确认上层 `docs/prototypes` 原型图片目录。
2. 创建前端工程。
3. 创建后端工程。
4. 定义 API 类型。
5. 后端接通 `occ --version` 和 `occ doctor`。
6. 前端按图片静态还原首页和会话页。

M1 完成后再接 `occ run`，这样不会一上来就把 UI、API、调度三件事搅在一起。
