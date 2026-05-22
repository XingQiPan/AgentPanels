# Agent 看板接入 `one-code-cli` 使用说明

本文面向上层 `AgentPanels` 看板开发。`one-code-cli` 的命令名是 `occ`，它在这个架构里承担底层调度员角色：负责选择 Agent、调用具体 coding CLI、捕获输出、保存运行记录和维护会话索引。

看板层不需要重新实现 Claude、Codex、opencode、Gemini 的调用细节，应该把 `occ` 当作统一运行时来使用。

本文属于上层 `AgentPanels` 文档，应放在：

```text
E:\Codes\AgentPanels\docs\agent-dashboard-usage.zh-CN.md
```

`one-code-cli/` 目录只保留底层调度员源码和它自己的文档。

## 1. 核心定位

`occ` 负责这些事情：

- 按 `--agent` 或 `--cli` 选择实际执行者。
- 把统一任务转换为底层 CLI 命令。
- 启动子进程并捕获 stdout / stderr。
- 生成 `run_id` 和 `session_id`。
- 写入运行产物：`prompt.md`、`result.md`、`stdout.log`、`stderr.log`、`command.json`、`run.toml`、`events.jsonl`。
- 维护运行索引和会话索引。

看板层负责这些事情：

- 多工作区管理。
- 任务输入和分派体验。
- 展示运行流水线、实时日志、执行过程和结果。
- 展示 Agents、Skills、会话和运行记录。
- 提供自定义 Agent 的配置入口。
- 聚合多个 workspace 的任务状态。

架构边界：

- 前端只能调用后端 API，不能直接执行 `occ`。
- 后端是唯一能执行 `occ` 的层。
- 所有会改变状态的动作都必须通过 `occ`：任务分派、会话恢复、Agent 创建/测试、Skill 安装。
- 后端可以读取 `occ` 生成的产物用于展示，但不能绕过 `occ` 直接调用底层 CLI。

## 2. 基础检查

在项目根目录或任意工作目录运行：

```powershell
occ --help
occ doctor
occ clis list
occ agents list
occ skills list
```

如果是从源码开发，可以用：

```powershell
cargo run -- --help
cargo run -- clis list
cargo run -- agents list
```

`occ clis list` 应该能看到内置支持的 CLI：

- `claude`
- `codex`
- `opencode`
- `gemini`

## 3. 初始化配置

首次使用建议创建用户级配置：

```powershell
occ config init --user
occ config validate
```

配置默认位置：

```text
~/.occ/config.toml
```

项目级配置可以放在：

```text
<workspace>/.occ/config.toml
```

`occ` 会按当前工作目录查找配置，并合并内置 Agent。

## 4. Agent 配置模型

在 `occ` 内部，Agent 对应配置里的 `[[agents]]`。一个 Agent 可以指定底层 CLI、模型、推理强度、环境变量、隔离配置目录和额外参数。

示例：

```toml
version = 1
default_agent = "codex"
doc_root = ".occ"

[[agents]]
name = "codex"
cli_type = "codex"
command = "codex"
model = "gpt-5.5"
effort = "high"
args_strategy = "builtin"
prompt_via = "stdin"
```

常用字段：

- `name`：Agent 名称，看板里可作为执行者名称。
- `aliases`：别名。
- `cli_type`：底层 CLI 类型，例如 `claude`、`codex`、`opencode`、`gemini`。
- `model`：默认模型。
- `effort`：默认推理强度。
- `config_dir`：隔离后的 CLI 系统配置目录。
- `env_mode`：环境继承方式，`inherit` 或 `strict`。
- `env`：Agent 专属环境变量。
- `args_strategy`：参数策略，常用 `builtin`。

新增 Agent：

```powershell
occ agents add deepseek-cc --cli claude --model deepseek-chat --set-cli-default
```

查看 Agent：

```powershell
occ agents list
occ agents show deepseek-cc
occ agents test deepseek-cc
```

## 5. 分派一次任务

看板创建任务时，推荐使用非交互模式，并要求 JSON 输出：

```powershell
occ run `
  --agent codex `
  --cwd "<workspacePath>" `
  --prompt "请检查这个项目的 README 是否需要更新" `
  --non-interactive `
  --stream `
  --output json
```

返回示例：

```json
{
  "success": true,
  "run_id": "run_20260521_103601_7c0c",
  "session_id": "sess_20260521_103601_28c3",
  "agent": "codex",
  "cli": "codex",
  "model": "gpt-5.5",
  "model_source": "agent",
  "effort": "high",
  "effort_source": "agent",
  "cwd": "E:/Codes/AgentPanels/example-workspace",
  "result_path": "E:/Codes/AgentPanels/example-workspace/.occ/runs/run_20260521_103601_7c0c/result.md",
  "metadata_path": "E:/Codes/AgentPanels/example-workspace/.occ/runs/run_20260521_103601_7c0c/run.toml",
  "exit_code": 0
}
```

看板应该保存或索引这些字段：

- `run_id`
- `session_id`
- `agent`
- `cli`
- `model`
- `effort`
- `cwd`
- `result_path`
- `metadata_path`
- `success`
- `exit_code`

## 6. 多 Agent 并行分派

同一个任务可以同时分派给多个精确 Agent：

```powershell
occ run `
  --agents claude,codex,gemini `
  --cwd "<workspacePath>" `
  --prompt "请分别评审这个项目的架构风险" `
  --non-interactive `
  --stream `
  --output json
```

返回中会包含：

- `batch_id`
- `runs[]`
- `errors[]`

每个 `runs[]` 都有独立的 `run_id`、`session_id` 和产物目录。看板可以把它展示成一个批次任务，下面挂多个 Agent 子任务。

## 7. 运行产物目录

每次运行会写入：

```text
<doc_root>/runs/<run_id>/
  prompt.md
  result.md
  stdout.log
  stderr.log
  events.jsonl
  command.json
  run.toml
  artifacts/
```

各文件用途：

- `prompt.md`：本次任务提示词。
- `result.md`：最终结果，优先展示给用户。
- `stdout.log`：子 CLI 标准输出。
- `stderr.log`：子 CLI 标准错误。
- `events.jsonl`：结构化事件。目前主要包含 `run_finished`。
- `command.json`：实际执行命令、参数、cwd、环境键、prompt 传输方式。
- `run.toml`：运行元数据。
- `artifacts/`：预留产物目录。

看板打开某个会话或运行时，建议读取顺序：

1. `run.toml`
2. `command.json`
3. `result.md`
4. `stdout.log`
5. `stderr.log`
6. `events.jsonl`

## 8. 实时日志

任务执行时，`occ` 会持续写入：

```text
stdout.log
stderr.log
```

需要注意：当前 `occ run --output json` 的 `run_id` 通常在命令结束后才通过 stdout JSON 返回。如果后端同步等待 `occ` 完成，前端无法在任务刚开始时就知道 `run_id` 和 run 目录。

第一版实时日志建议采用两层状态：

- 看板后端先生成自己的 `dashboardRunId`，并把状态标记为 `queued` / `running`。
- `occ` 完成后，后端拿到 `run_id`，再绑定 `dashboardRunId -> run_id`。

如果要在 `occ` 运行过程中实时 tail `stdout.log` / `stderr.log`，需要满足其中一个条件：

- 后端能提前推导或获知 run 目录。
- `occ` 增强为启动时输出 `run_started` 事件和 run 目录。
- `occ` 提供 daemon / event stream。

在当前能力下，看板至少可以展示：

- 后端捕获到的 `--stream` 输出。
- `occ` 完成后的 `stdout.log` / `stderr.log`。
- `result.md`、`run.toml`、`command.json`。

日志展示类型：

- 标准输出
- 标准错误
- 合并日志

如果命令加了 `--stream`，子进程输出会镜像到父进程 stderr。看板后端可以捕获这部分输出并通过 SSE / WebSocket 转发给前端。任务完成后，再以 run 目录里的日志文件作为最终记录。

## 9. 会话恢复

如果用户在看板中打开一个会话继续追问，可以使用：

```powershell
occ run `
  --session sess_20260521_103601_28c3 `
  --resume `
  --prompt "继续刚才的任务，请补充测试建议" `
  --non-interactive `
  --stream `
  --output json
```

也可以恢复最近匹配的会话：

```powershell
occ run `
  --resume `
  --agent codex `
  --cwd "<workspacePath>" `
  --prompt "继续上一次会话" `
  --output json
```

注意：

- `occ` 有自己的 `session_id`。
- 某些底层 CLI 还有自己的原生 session id。
- 如果 Agent 与原会话不匹配，`occ` 会返回 `session_agent_mismatch`。
- 如果底层 CLI 不支持恢复，可能返回 `resume_unsupported` 或 `backend_session_missing`。

## 10. 运行记录和会话记录

查看运行记录：

```powershell
occ runs list --limit 20
occ runs show <run_id>
occ runs open <run_id> --print
```

查看会话：

```powershell
occ sessions list --limit 20
occ sessions show <session_id>
occ sessions latest --agent codex --cwd "<workspacePath>"
```

当前版本里，这些 list 命令主要输出表格文本。看板开发时有两种方案：

- 短期：由后端读取 `doc_root/index.jsonl` 和 `~/.occ/sessions.sqlite`，整理成 API 返回给前端。
- 长期：给 `runs`、`sessions`、`agents`、`skills` 补 `--output json`。

## 11. Skills

查看内置 Skills：

```powershell
occ skills list
occ skills show using-one-code-cli
```

安装到默认目录：

```powershell
occ skills install
occ skills doctor
```

默认安装位置：

```text
~/.agents/skills
```

看板里建议把 Skills 做成一级入口，不要藏在设置里。用户应该能看到：

- 已安装 Skills
- 可安装 Skills
- Skill 描述
- Skill 文件位置
- 哪些 Agent 默认使用了哪些 Skills

## 12. 看板后端推荐接入方式

第一阶段可以把 `occ` 当作外部命令调用：

```text
看板后端
  -> spawn occ run --output json
  -> 解析 stdout JSON
  -> tail stdout.log / stderr.log
  -> 读取 result.md / run.toml / command.json
```

推荐后端动作：

- `POST /api/runs`：调用 `occ run` 创建任务。
- `GET /api/runs`：读取 `doc_root/index.jsonl`。
- `GET /api/runs/:run_id`：读取 `run.toml` 和 `command.json`。
- `GET /api/runs/:run_id/result`：读取 `result.md`。
- `GET /api/runs/:run_id/logs`：读取或 tail `stdout.log`、`stderr.log`。
- `GET /api/sessions`：读取 `~/.occ/sessions.sqlite`。
- `POST /api/sessions/:session_id/resume`：调用 `occ run --session ... --resume`。
- `GET /api/agents`：调用 `occ agents list`，必要时读取 `occ config show --raw` 补充展示信息。
- `GET /api/skills`：调用 `occ skills list`，必要时读取内置和用户 Skills 目录补充展示信息。

边界要求：

- 前端只能调用 `/api/*`，不能直接读取本地文件或执行命令。
- 后端可以读取 `occ` 产物用于展示。
- 后端写入配置、安装 Skill、测试 Agent、创建任务、恢复会话时，必须调用 `occ`。
- 后端不能直接调用 Claude、Codex、opencode、Gemini。

第二阶段建议增强 `one-code-cli` 的稳定接入面：

- 增加稳定的 `occ` JSON 输出或 `occ daemon`。
- 如需库模式，应通过 `one-code-cli` 暴露稳定 facade，而不是让看板直接依赖内部模块细节。
- 给 `runs list`、`sessions list`、`agents list`、`skills list` 增加 `--output json`。
- 给 `events.jsonl` 增加更多事件类型。
- 记录运行中的任务状态，而不是只在结束后写 index。

## 13. 看板需要展示的关键字段

任务卡片建议展示：

- 任务标题
- `run_id`
- `session_id`
- Agent
- CLI
- 模型
- 推理强度
- 当前状态
- 工作目录
- 开始时间
- 结束时间
- 耗时
- 结果路径

运行详情建议展示：

- Prompt
- 实际命令
- stdout
- stderr
- result.md
- run.toml
- command.json
- events.jsonl

会话详情建议展示：

- 会话 ID
- 所属 workspace
- Agent / CLI
- 最近一次 run
- 历史 runs
- 继续会话输入框

## 14. 当前限制和后续增强

当前限制：

- 部分列表命令没有 JSON 输出。
- `events.jsonl` 事件粒度较粗。
- 会话消息 transcript 没有完整持久化为对话表。
- 运行中状态需要看板层自己跟踪进程或 tail 日志。
- Windows 下路径可能出现 `\\?\` 前缀，看板展示时需要做路径美化。

建议增强：

- 增加结构化事件：`queued`、`started`、`stdout`、`stderr`、`artifact_created`、`finished`、`failed`、`cancelled`。
- 增加任务取消接口。
- 增加 `occ daemon` 或本地 HTTP server。
- 增加 Workspace 概念，统一管理多个 cwd。
- 增加 Skills 与 Agent 的关联配置。
- 增加自定义 Agent 的可视化配置表单。

## 15. 最小可用闭环

上层看板第一版可以只做这个闭环：

1. 选择 workspace。
2. 选择 Agent。
3. 输入任务。
4. 后端调用 `occ run --output json`。
5. 前端展示运行卡片。
6. 打开运行详情。
7. 展示 `stdout.log`、`stderr.log` 和 `result.md`。
8. 支持 `--session <id> --resume` 继续会话。

这个闭环已经能证明：`one-code-cli` 作为调度员，上层看板作为控制台，是可行的。
