import { Bot, ChevronRight, FileText, Folder, GitBranch, Play, Send, Upload } from "lucide-react";
import type { HealthStatus } from "../api/client";

const timeline = ["会话已创建", "主 Agent 开始规划与任务分派", "codex 已加入会话并开始执行", "claude 执行单元测试", "等待主 Agent 审校与整合"];
const logs = [
  "[codex] $ cargo test -p pricing --lib",
  "[codex] running 18 tests",
  "[codex] test result: ok. 18 passed; 0 failed",
  "[claude] $ cargo test -p pricing-repo",
  "[claude] test repo::tests::test_query ... ok",
];

export function SessionDetailPage({ healthStatus }: { healthStatus: HealthStatus }) {
  return (
    <div className="session-layout">
      <aside className="panel file-pane">
        <div className="pane-tabs"><span>AgentPanels</span><span className="active">one-code-cli</span><span>Website</span></div>
        <select aria-label="工作区选择">
          <option>one-code-cli</option>
        </select>
        <h2>目录结构</h2>
        {["src", "components", "runner.rs", "session.rs", "run_record.rs", "docs", "README.md", "architecture.md"].map((item) => (
          <div className="tree-row" key={item}>
            {item.includes(".") ? <FileText size={16} /> : <Folder size={16} />}
            <span>{item}</span>
          </div>
        ))}
        <div className="agent-stack">
          <h3>Agents</h3>
          {["主 Agent", "codex", "claude"].map((agent) => (
            <div className="mini-row" key={agent}><Bot size={15} />{agent}<span /></div>
          ))}
        </div>
      </aside>

      <section className="panel conversation-pane">
        <div className="panel-header">
          <div>
            <h1>会话</h1>
            <p>重构定价模块</p>
          </div>
          <button className="ghost-button" type="button"><Upload size={16} />导出会话</button>
        </div>
        <div className="tabs"><span className="active">对话</span><span>执行过程</span><span>结果</span></div>
        <div className="message user"><strong>用户</strong><span>请帮我重构定价模块，拆分定价计算逻辑与检索逻辑，提升可维护性，并补充单元测试。</span></div>
        <div className="message agent">
          <strong>主 Agent</strong>
          <span>已理解任务目标，计划拆分任务并分派给合适的子 Agent 执行。</span>
          <div className="assignment">
            <div><Bot size={18} /><b>codex</b><em>执行中</em><small>重构定价计算逻辑，拆分模块，完善单元测试</small></div>
            <div><Bot size={18} /><b>claude</b><em>执行中</em><small>开发定价检索层，优化数据访问与缓存策略</small></div>
          </div>
        </div>
        {["codex 已开始分析并重构定价计算模块，整理单元测试用例。", "claude 已完成定价检索层的实现，正在优化缓存与索引策略。", "主 Agent：子任务仍在执行中，等待完成后将进行整合与评审。"].map((text) => (
          <div className="message agent compact" key={text}><strong>{text.startsWith("主") ? "主 Agent" : text.startsWith("claude") ? "claude" : "codex"}</strong><span>{text}</span></div>
        ))}
        <div className="composer">
          <input aria-label="会话输入" placeholder="继续补充任务或让主 Agent 调整分派..." />
          <button className="primary-button" type="button"><Send size={17} /></button>
        </div>
      </section>

      <aside className="panel inspect-pane">
        <div className="tabs wide"><span className="active">执行时间线</span><span>实时日志</span><span>产物</span><span>运行信息</span></div>
        <div className="timeline">
          {timeline.map((item, index) => <div className="timeline-row" key={item}><Play size={14} /><time>10:41:{12 + index}</time><span>{item}</span></div>)}
        </div>
        <h3>实时日志</h3>
        <pre>{logs.join("\n")}</pre>
        <h3>产物</h3>
        <div className="artifact-grid"><button>打开 result.md</button><button>打开 diff.patch</button><button>打开日志目录</button></div>
        <h3>运行信息</h3>
        <div className="info-grid">
          <span>运行 ID</span><code>run_91b7d2e9</code>
          <span>模型</span><code>codex / claude-3.5-sonnet</code>
          <span>健康</span><code>{healthStatus.label}</code>
        </div>
      </aside>
    </div>
  );
}
