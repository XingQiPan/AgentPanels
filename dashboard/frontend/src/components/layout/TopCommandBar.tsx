import { Bell, CircleHelp, Grid2X2, RefreshCw, Send, Terminal, UserRound } from "lucide-react";
import type { HealthStatus } from "../../api/client";

type TopCommandBarProps = {
  healthStatus: HealthStatus;
};

export function TopCommandBar({ healthStatus }: TopCommandBarProps) {
  return (
    <header className="topbar">
      <div className="workspace-switcher">
        <span>当前工作区：</span>
        <strong>one-code-cli</strong>
        <span>⌄</span>
      </div>
      <button className="ghost-button compact" type="button">
        <Grid2X2 size={17} />
        全局视图
      </button>
      <div className="command-input">
        <Terminal size={18} />
        <input aria-label="任务输入框" placeholder="让主 Agent 分派一个任务..." />
        <kbd>⌘K</kbd>
      </div>
      <button className="primary-button" type="button">
        <Send size={17} />
        分派
      </button>
      <div className={`health-chip ${healthStatus.state}`}>
        <span className="status-dot" />
        {healthStatus.label}
      </div>
      <div className="top-actions">
        <button aria-label="刷新" className="icon-button" type="button">
          <RefreshCw size={18} />
        </button>
        <button aria-label="通知" className="icon-button" type="button">
          <Bell size={18} />
        </button>
        <button aria-label="帮助" className="icon-button" type="button">
          <CircleHelp size={18} />
        </button>
        <button aria-label="用户入口" className="avatar-button" type="button">
          <UserRound size={17} />
          JD
        </button>
      </div>
    </header>
  );
}
