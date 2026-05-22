import {
  Bot,
  Boxes,
  Braces,
  ClipboardList,
  Code2,
  Home,
  MessageSquare,
  Settings,
  Sparkles,
} from "lucide-react";
import type { HealthStatus } from "../../api/client";
import type { PageKey } from "./AppShell";

const navItems: Array<{ key: PageKey; label: string; icon: typeof Home }> = [
  { key: "overview", label: "总览", icon: Home },
  { key: "workspace", label: "工作区", icon: Boxes },
  { key: "agents", label: "Agents", icon: Bot },
  { key: "skills", label: "Skills", icon: Braces },
  { key: "sessions", label: "会话", icon: MessageSquare },
  { key: "runs", label: "运行记录", icon: ClipboardList },
  { key: "builder", label: "Agent 开发", icon: Code2 },
  { key: "settings", label: "设置", icon: Settings },
];

type LeftNavigationProps = {
  activePage: PageKey;
  healthStatus: HealthStatus;
  onNavigate: (page: PageKey) => void;
};

export function LeftNavigation({ activePage, healthStatus, onNavigate }: LeftNavigationProps) {
  return (
    <aside className="left-nav">
      <div className="brand">
        <div className="brand-mark">A</div>
        <span>Agent 看板</span>
      </div>

      <nav className="nav-list" aria-label="主导航">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              className={`nav-item ${activePage === item.key ? "active" : ""}`}
              key={item.key}
              onClick={() => onNavigate(item.key)}
              type="button"
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <section className="workspace-list">
        <div className="section-title">
          <span>工作区列表</span>
          <span>+</span>
        </div>
        {[
          ["AgentPanels", "运行中 3", "blue"],
          ["one-code-cli", "运行中 2", "green"],
          ["Website", "运行中 1", "amber"],
          ["Docs", "运行中 0", "gray"],
        ].map(([name, meta, tone]) => (
          <button className={`workspace-pill ${name === "one-code-cli" ? "selected" : ""}`} key={name} type="button">
            <span className={`dot ${tone}`} />
            <span>
              <strong>{name}</strong>
              <small>{meta}</small>
            </span>
          </button>
        ))}
      </section>

      <section className="agent-card mini">
        <div className="agent-head">
          <Sparkles size={18} />
          <strong>主 Agent</strong>
          <span className={`status-dot ${healthStatus.state}`} />
        </div>
        <p>N-MA-S</p>
        <small>{healthStatus.label}</small>
      </section>
    </aside>
  );
}
