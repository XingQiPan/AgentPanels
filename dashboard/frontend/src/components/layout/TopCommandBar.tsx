import { Send, Terminal } from "lucide-react";
import type { HealthStatus } from "../../api/client";

type TopCommandBarProps = {
  healthStatus: HealthStatus;
};

export function TopCommandBar({ healthStatus }: TopCommandBarProps) {
  return (
    <header className="topbar">
      <div className="workspace-switcher">
        <span>当前工作区：</span>
        <strong>等待后端接入</strong>
      </div>
      <div className="command-input">
        <Terminal size={18} />
        <input aria-label="任务输入框" disabled placeholder="在总览右侧分派真实 occ 任务" />
      </div>
      <button className="primary-button" disabled type="button">
        <Send size={17} />
        分派
      </button>
      <div className={`health-chip ${healthStatus.state}`}>
        <span className="status-dot" />
        {healthStatus.label}
      </div>
    </header>
  );
}
