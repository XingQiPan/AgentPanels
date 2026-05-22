import { Bot, Check, CloudUpload, Copy, Play, Save, ToggleRight } from "lucide-react";
import type { HealthStatus } from "../api/client";

const permissions = ["读取文件 (read_file)", "修改文件 (write_file)", "执行命令 (run_command)", "使用网络 (network)", "打开结果 (open_result)", "写入配置 (write_config)"];

export function AgentBuilderPage({ healthStatus }: { healthStatus: HealthStatus }) {
  return (
    <div className="builder-layout">
      <section className="panel builder-form">
        <div className="panel-header">
          <div><h1>开发新 Agent</h1><p>创建可被主 Agent 调度执行的自定义 Agent。</p></div>
          <span className="tag success"><Bot size={15} />主 Agent 可调度</span>
        </div>
        <div className="tabs"><span className="active">基本信息</span><span>能力与 Skills</span><span>工具权限</span><span>调度策略</span><span>测试运行</span></div>
        <div className="builder-columns">
          <div className="form-card">
            <h2>基本信息</h2>
            <label>Agent 名称<input value="代码审查专家" readOnly /></label>
            <label>描述<textarea value="擅长代码质量审查、风格一致性检查与潜在缺陷分析" readOnly /></label>
            <div className="segmented"><button className="active">claude</button><button>codex</button><button>gemini</button><button>opencode</button></div>
            <label>命令路径<input value="/usr/local/bin/claude" readOnly /></label>
            <div className="two-col"><label>模型<select><option>claude-3.5-sonnet</option></select></label><label>推理强度<select><option>high</option></select></label></div>
            <label>系统提示词<textarea value={"作为代码审查专家，你需要：\n1. 关注代码质量与可维护性\n2. 检查潜在的 bug 与安全风险\n3. 提供清晰的改进建议"} readOnly /></label>
          </div>
          <div className="form-card">
            <h2>Skills 选择</h2>
            <div className="skill-grid selectable">{["using-one-code-cli", "code-review", "ui-prototype", "test-runner", "docs-writer", "deploy-check"].map((skill, index) => <article className={index < 3 ? "selected" : ""} key={skill}><strong>{skill}</strong>{index < 3 ? <Check size={16} /> : null}<small>任务分派与结果处理</small></article>)}</div>
            <h2>工具权限</h2>
            <div className="permission-list">{permissions.map((item, index) => <div className="permission-row" key={item}><span>{item}</span><ToggleRight className={index < 5 ? "enabled" : ""} size={28} /></div>)}</div>
            <h2>调度策略</h2>
            <div className="strategy-grid"><label>适合任务<textarea value="代码审查、质量评估、静态分析、重构建议、风格检查" readOnly /></label><label>不适合任务<textarea value="UI 设计、前端界面开发、音视频处理、大规模数据处理" readOnly /></label></div>
          </div>
        </div>
      </section>

      <aside className="panel preview-pane">
        <div className="panel-header slim"><h2>实时预览</h2><div className="header-actions"><button className="ghost-button" type="button"><Copy size={15} />复制</button><button className="ghost-button" type="button">重新生成</button></div></div>
        <h3>occ 配置（profile.toml）</h3>
        <pre>{`[agent]
name = "代码审查专家"
cli = "claude"
model = "claude-3.5-sonnet"
effort = "high"
timeout = 900

[capabilities]
read_file = true
write_file = true
run_command = true
network = true
open_result = true
write_config = false

[skills]
using-one-code-cli = true
code-review = true
test-runner = true`}</pre>
        <h3>occ dry-run（命令计划预览）</h3>
        <pre>{`{
  "cli": "claude",
  "model": "claude-3.5-sonnet",
  "cwd": "/workspace/one-code-cli",
  "tools": ["read_file", "run_command", "open_result"],
  "health": "${healthStatus.label}"
}`}</pre>
        <h3>测试运行（不保存）</h3>
        <div className="test-run"><input aria-label="测试任务" placeholder="输入测试任务..." /><button className="primary-button" type="button"><Play size={16} />测试运行</button></div>
        <div className="run-log">{["验证 配置文件 profile.toml 语法检查通过", "构建 occ dry-run 命令计划生成完成", "执行 启动 claude 运行任务执行", "成功 任务完成，耗时 00:00:24"].map((line) => <p key={line}>{line}</p>)}</div>
        <div className="footer-actions"><button className="ghost-button" type="button"><Save size={16} />保存 Agent</button><button className="primary-button" type="button"><CloudUpload size={16} />发布到工作区</button></div>
      </aside>
    </div>
  );
}
