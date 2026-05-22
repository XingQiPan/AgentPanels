# AgentPanels

AgentPanels 是基于 `one-code-cli` 的 Agent 看板与集成 UI 工具设计项目。

当前仓库包含：

- `dashboard/`：前后端分离的中文 Agent 看板。
- `docs/`：产品设计、架构方案、开发计划与 UI 原型。
- `one-code-cli/`：底层调度器源码，后端通过 `occ` 统一调用。

## 本地运行

```powershell
cd dashboard
npm install
npm run dev:backend
npm run dev:frontend
```

默认地址：

- 后端 API：`http://127.0.0.1:43110`
- 前端看板：`http://127.0.0.1:43111`

如需让健康检查显示 `occ` 可用，先编译底层调度器：

```powershell
cd one-code-cli
cargo build
```

