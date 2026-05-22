# Agent 看板开发决策

本文用于在开发前收敛方向。结论先行：第一阶段采用 **前后端分离的本地 Web 看板 + 本地 Backend API + `occ` CLI 调度**。先不做 Tauri 桌面壳，也不先大改 `one-code-cli` 内核。

---

## 1. 已确定约束

- UI 必须基于 `docs/prototypes` 图片开发。
- 文档和看板代码属于上层 `AgentPanels` 项目。
- `one-code-cli/` 是底层调度员源码目录。
- 前端不能直接调用 `occ`。
- 后端是唯一能调用 `occ` 的层。
- 所有操作工具必须是 `one-code-cli` 的 `occ`。
- 第一版必须预留接口，但不追求一次实现全部高级能力。

---

## 2. 三种开发路线

### 方案 A：本地 Web 前后端分离

结构：

```text
dashboard/frontend  ->  dashboard/backend  ->  occ
```

优点：

- 最符合当前“前后端分离”要求。
- UI 迭代最快。
- 后端可以清楚封装 `occ`、日志、SQLite、文件读取。
- 后续容易封装成桌面应用。

缺点：

- 需要同时维护前端和后端两个 dev server。
- 本地文件访问和权限需要后端处理好。

结论：推荐作为第一阶段。

### 方案 B：Tauri 桌面应用优先

结构：

```text
Tauri WebView  ->  Tauri/Rust commands  ->  occ
```

优点：

- 更像本地开发工具。
- 文件系统、打开目录、打开产物体验更自然。
- 后续打包分发更完整。

缺点：

- 初期工程复杂度更高。
- 容易把前后端边界做糊。
- UI 还没定型前，桌面壳会拖慢迭代。

结论：第二阶段再考虑。

### 方案 C：先增强 `one-code-cli`

结构：

```text
先做 occ JSON / events / daemon  ->  再做看板
```

优点：

- 底层能力更稳。
- 看板后端后续会更简单。

缺点：

- 看不到产品形态，容易在底层打转。
- 图片原型的 UI 风险没有提前暴露。
- 第一版闭环会变慢。

结论：不作为第一阶段，但在 M2/M3 后逐步反哺 `occ`。

---

## 3. 最终选择

选择 **方案 A：本地 Web 前后端分离**。

第一阶段只做本地单用户模式：

```text
浏览器前端
  -> 本地后端 API
  -> spawn occ
  -> 读取 occ 产物
  -> 返回结构化数据给前端
```

后续演进：

```text
spawn occ
  -> occ JSON 增强
  -> occ events
  -> occ daemon
  -> Tauri 桌面封装
```

---

## 4. 第一开发切片

第一开发切片只做一个可运行闭环，避免范围扩散。

### 4.1 范围

必须做：

- 前端首页静态还原 `01-workspace-focused-dashboard-cn.png`。
- 后端 `GET /api/health`。
- 后端 `GET /api/workspaces`。
- 后端 `GET /api/agents`。
- 后端 `POST /api/runs`。
- 后端调用 `occ run --output json`。
- 前端能提交任务。
- 前端能看到运行卡片。
- 前端能打开运行结果。

暂不做：

- 真正主 Agent 智能规划。
- 插件市场。
- 远程协作。
- Tauri 打包。
- 完整 Agent 编辑。
- 完整 Skills 绑定。
- 真正运行取消。

### 4.2 验收路径

1. 启动后端。
2. 后端确认 `occ --version` 和 `occ doctor` 可用。
3. 启动前端。
4. 首页布局接近图片。
5. 添加或选择一个 workspace。
6. 选择一个 Agent。
7. 输入任务并分派。
8. 后端执行 `occ run --output json`。
9. 前端显示运行卡片。
10. 运行完成后打开结果。

---

## 5. 工程结构决策

在上层项目创建：

```text
dashboard/
  frontend/
  backend/
  shared/
```

`shared/` 存放前后端共用类型：

```text
dashboard/shared/
  api.ts
  dashboard.ts
  occ.ts
```

第一版技术选择：

- 前端：React + Vite。
- 后端：Node.js + Fastify。
- 实时事件：先用 SSE。
- 本地持久化：先用 JSON 文件，M2 再切 SQLite。
- `occ` 调用：Node `child_process.spawn`，只允许 spawn `occ`。

选择理由：

- Vite + React 启动快，适合按图片还原 UI。
- Fastify 简洁，API 边界清楚。
- JSON 文件足够支撑第一版 workspace 和消息存储。
- SQLite 可以等会话消息和运行索引稳定后再引入。

---

## 6. 最小 API

第一切片只实现：

```http
GET  /api/health
GET  /api/workspaces
POST /api/workspaces
GET  /api/agents
POST /api/runs
GET  /api/runs/:runId
GET  /api/runs/:runId/result
GET  /api/runs/:runId/logs
GET  /api/events/stream
```

必须预留但可以返回 `501`：

```http
POST /api/main-agent/plan
POST /api/main-agent/route
POST /api/runs/:runId/cancel
POST /api/sessions/:sessionId/resume
POST /api/agents
POST /api/skills/install
POST /api/occ/daemon/connect
```

---

## 7. 关键实现原则

- UI 先按图片做静态布局，再接真实数据。
- 后端先用 mock 数据跑通接口，再接 `occ`。
- 接 `occ` 时先用 mock agent，避免一上来依赖真实 Claude/Codex 登录状态。
- 所有路径进入前端前都做展示清洗。
- 所有错误都保留 `source` 和 `code`。
- 第一版不追求实时拿到 `run_id`，用 `dashboardRunId` 表示运行中状态。

---

## 8. 当前推荐开工顺序

1. 创建 `dashboard/frontend`、`dashboard/backend`、`dashboard/shared`。
2. 定义共享类型和 API 响应结构。
3. 后端实现 `/api/health`，调用 `occ --version`。
4. 前端按图片还原首页静态布局。
5. 后端实现 workspaces 和 agents mock API。
6. 前端接 workspaces 和 agents。
7. 后端实现 `POST /api/runs`，先跑 mock agent。
8. 前端接任务分派。
9. 后端读取 `result.md` 和 logs。
10. 前端做运行结果详情。

这 10 步完成后，才进入会话详情页。
