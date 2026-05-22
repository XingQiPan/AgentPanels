import { Bot, CheckCircle2, Clock3, Filter, Plus, ShieldCheck, Sparkles, Star, Zap } from "lucide-react";
import type { HealthStatus } from "../api/client";

const pipeline = [
  {
    title: "待分派",
    count: 2,
    items: [
      ["实现任务优先级排序", "claude", "run_8f3a2c1b", "待分派", "spark"],
      ["改进命令行交互体验", "gemini", "run_c2d9e7a4", "待分派", "star"],
    ],
  },
  {
    title: "执行中",
    count: 2,
    items: [
      ["重构定价模块", "codex", "run_91b7d2e9", "62%", "bot"],
      ["更新 API 文档", "opencode", "run_2d6f8b11", "41%", "spark"],
    ],
  },
  {
    title: "待确认",
    count: 2,
    items: [
      ["完善权限模型设计", "codex", "run_7c3b2a91", "待确认", "lab"],
      ["更新页面文档结构", "gemini", "run_d26f8b11", "待确认", "star"],
    ],
  },
  {
    title: "已完成",
    count: 2,
    items: [
      ["搭建 CI 工作流", "codex", "run_e1d4f6a2", "成功", "shield"],
      ["修复类型错误", "claude", "run_6f0a9b7e", "成功", "spark"],
    ],
  },
];

const events = [
  ["10:41:12", "[one-code-cli / codex]", "正在读取 sessions.sqlite..."],
  ["10:41:13", "[AgentPanels / claude]", "已启动运行 run_91b7d2e9：重构定价模块"],
  ["10:41:14", "[Website / gemini]", "正在检查文件变更..."],
  ["10:41:15", "[Docs / claude]", "任务 run_3e7a9b5c 已进入执行队列"],
  ["10:41:16", "[one-code-cli / codex]", "安全扫描发现潜在漏洞，等待修复"],
  ["10:41:18", "[AgentPanels / codex]", "任务 run_7c3b2a91 执行完成，等待确认"],
];

const iconMap = {
  bot: Bot,
  shield: ShieldCheck,
  spark: Zap,
  star: Star,
  lab: Sparkles,
};

export function HomePage({ healthStatus }: { healthStatus: HealthStatus }) {
  return (
    <div className="dashboard-grid">
      <section className="panel pipeline-panel">
        <div className="panel-header">
          <div>
            <h1>运行流水线</h1>
            <p>主 Agent 将任务拆分后，按状态推进到执行与确认。</p>
          </div>
          <div className="header-actions">
            <button className="ghost-button" type="button">
              <Filter size={16} />
              筛选
            </button>
            <button className="ghost-button" type="button">
              <Clock3 size={16} />
              排序：更新时间
            </button>
          </div>
        </div>
        <div className="kanban">
          {pipeline.map((column) => (
            <article className="kanban-column" key={column.title}>
              <div className="column-title">
                <h2>{column.title}</h2>
                <span>{column.count}</span>
              </div>
              {column.items.map(([title, agent, runId, state, icon]) => {
                const Icon = iconMap[icon as keyof typeof iconMap];
                return (
                  <div className="task-card" key={runId}>
                    <div className="task-title">
                      <Icon size={18} />
                      <strong>{title}</strong>
                    </div>
                    <p>{agent}</p>
                    <code>{runId}</code>
                    {state.endsWith("%") ? <div className="progress"><span style={{ width: state }} /></div> : null}
                    <div className="task-meta">
                      <span className={state === "成功" ? "tag success" : "tag"}>{state}</span>
                      <small>{state.endsWith("%") ? "00:08:41" : "--:--"}</small>
                    </div>
                  </div>
                );
              })}
              <button className="add-task" type="button">
                <Plus size={16} />
                添加任务
              </button>
            </article>
          ))}
        </div>
      </section>

      <aside className="panel right-rail">
        <div className="rail-header">
          <h2>主 Agent 调度</h2>
          <span className="online">在线</span>
        </div>
        <section className="rail-card">
          <div className="rail-title">路由队列</div>
          <div className="queue-tabs"><span>进行中 4</span><span>待处理 3</span><span>等待中 2</span></div>
          {["重构定价模块", "开发会话文件存储", "修复导航栏响应式问题", "更新 API 文档"].map((item, index) => (
            <div className="queue-row" key={item}>
              <span>{index + 1}</span>
              <strong>{item}</strong>
              <small>{["codex", "claude", "gemini", "opencode"][index]}</small>
            </div>
          ))}
        </section>
        <section className="rail-card">
          <div className="rail-title">后端 / occ 健康</div>
          <div className={`health-card ${healthStatus.state}`}>
            <CheckCircle2 size={18} />
            <div>
              <strong>{healthStatus.label}</strong>
              <small>{healthStatus.health?.occ.version ?? "等待 /api/health 响应"}</small>
            </div>
          </div>
        </section>
        <section className="rail-card">
          <div className="rail-title">已选 Skills</div>
          <div className="chip-list">
            {["code-review", "using-one-code-cli", "docs-writer", "ui-prototype", "test-runner"].map((skill) => (
              <span key={skill}>{skill}</span>
            ))}
          </div>
        </section>
        <section className="rail-card">
          <div className="rail-title">活跃 Agents</div>
          {["codex 2 个运行中", "claude 1 个运行中", "gemini 1 个运行中", "opencode 0 个运行中"].map((item) => (
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
      </aside>

      <section className="panel events-panel">
        <div className="panel-header slim">
          <h2>实时事件流</h2>
          <span className="online">实时</span>
        </div>
        <div className="event-list">
          {events.map(([time, source, detail]) => (
            <div className="event-row" key={`${time}-${detail}`}>
              <time>{time}</time>
              <code>{source}</code>
              <span>{detail}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
