import { Bot, CheckCircle2, CirclePlus, FileText, GitBranch, Server, Settings2, Wrench } from "lucide-react";
import type { HealthStatus } from "../api/client";

const agents = ["主 Agent", "codex-dev", "claude-reviewer", "gemini-docs", "opencode-runner"];
const skills = ["using-one-code-cli", "code-review", "ui-prototype", "test-runner", "docs-writer", "deploy-check"];
const rows = [
  ["sess_9b72cd", "重构定价模块", "codex-dev", "执行中", "正在生成 commit 变更..."],
  ["sess_7a3d1e", "完善 CI 工作流", "claude-reviewer", "待确认", "等待人工确认"],
  ["sess_4c1e9b", "修复内存泄漏问题", "codex-dev", "已完成", "任务完成"],
  ["sess_1f9a2d", "补充 API 使用示例", "gemini-docs", "已完成", "生成文档 3 个文件"],
  ["sess_0c8f6a", "触发调用失败排查", "opencode-runner", "失败", "返回码 1，命令执行失败"],
];

export function AgentsSkillsPage({ healthStatus }: { healthStatus: HealthStatus }) {
  return (
    <div className="workspace-layout">
      <aside className="panel file-pane">
        <h2>工作区：AgentPanels</h2>
        <div className="branch"><GitBranch size={15} />main <span>工作区干净</span></div>
        {["AgentPanels", "apps", "packages", "src", "docs", ".occ", "config.toml", "rules.md", "tools.json", "skills", "tests"].map((item) => (
          <div className="tree-row" key={item}>{item.includes(".") ? <FileText size={16} /> : <GitBranch size={16} />}<span>{item}</span></div>
        ))}
      </aside>

      <section className="panel workspace-main">
        <div className="panel-header">
          <div>
            <h1>AgentPanels 工作区</h1>
            <p>可调度 Agents、Skills 库与当前会话任务。</p>
          </div>
          <button className="ghost-button" type="button"><Settings2 size={16} />工作区设置</button>
        </div>
        <div className="metrics">
          <span><CheckCircle2 size={18} />occ 已配置</span>
          <span><Bot size={18} />默认 Agent N-MA-S</span>
          <span><Server size={18} />活跃会话 6</span>
          <span><FileText size={18} />未提交 2 个文件</span>
        </div>
        <h2>可调度 Agents</h2>
        <div className="agent-grid">
          {agents.map((agent, index) => <article className={`agent-tile ${index === 0 ? "selected" : ""}`} key={agent}><div>{agent.slice(0, 2)}</div><strong>{agent}</strong><small>{index === 0 ? "主协调与任务分派" : "代码实现与专项处理"}</small><span>在线</span></article>)}
          <article className="agent-tile add"><CirclePlus size={24} /><strong>开发新 Agent</strong><small>自定义行为、提示与工具权限</small></article>
        </div>
        <h2>Skills 库</h2>
        <div className="skill-grid">
          {skills.map((skill) => <article className="skill-tile" key={skill}><Wrench size={18} /><strong>{skill}</strong><small>已安装</small></article>)}
        </div>
        <div className="table-header"><h2>会话与任务</h2><button className="ghost-button" type="button">刷新</button></div>
        <table>
          <thead><tr><th>会话</th><th>任务</th><th>Agent</th><th>状态</th><th>最近事件</th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row[0]}>{row.map((cell, index) => <td key={cell}><span className={index === 3 ? "tag" : ""}>{cell}</span></td>)}</tr>)}</tbody>
        </table>
      </section>

      <aside className="panel right-rail">
        <section className="rail-card"><div className="rail-title">工作区上下文</div>{[".occ 配置  .occ/config.toml", "文档根目录  docs", "会话数据库  sessions.sqlite", "结果目录  .occ/results"].map((item) => <p key={item}>{item}</p>)}</section>
        <section className="rail-card"><div className="rail-title">环境健康</div>{["occ CLI", "Node.js", "Git", "磁盘空间"].map((item, index) => <div className="env-row" key={item}><span>{item}</span><code>{index === 0 ? (healthStatus.health?.occ.version ?? healthStatus.label) : ["v20.11.1", "2.44.0", "48 GB 可用"][index - 1]}</code><span className={`status-dot ${healthStatus.state}`} /></div>)}</section>
        <button className="primary-button full" type="button">在此工作区新建任务</button>
      </aside>
    </div>
  );
}
