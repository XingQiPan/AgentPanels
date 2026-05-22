import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { getWorkspaces, type HealthStatus, type WorkspaceSummary } from "../../api/client";
import type { PageKey } from "./AppShell";
import { visibleNavItems } from "./nav-items";

type LeftNavigationProps = {
  activePage: PageKey;
  healthStatus: HealthStatus;
  onNavigate: (page: PageKey) => void;
};

export function LeftNavigation({ activePage, healthStatus, onNavigate }: LeftNavigationProps) {
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [workspaceState, setWorkspaceState] = useState<"loading" | "ready" | "unavailable">("loading");

  useEffect(() => {
    const controller = new AbortController();

    getWorkspaces(controller.signal)
      .then((items) => {
        setWorkspaces(items);
        setWorkspaceState("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setWorkspaceState("unavailable");
      });

    return () => controller.abort();
  }, []);

  return (
    <aside className="left-nav">
      <div className="brand">
        <div className="brand-mark">A</div>
        <span>Agent 看板</span>
      </div>

      <nav className="nav-list" aria-label="主导航">
        {visibleNavItems.map((item) => {
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
        {workspaceState === "loading" ? <p className="muted-note">正在加载真实工作区...</p> : null}
        {workspaceState === "unavailable" ? <p className="muted-note">工作区后端接口尚未接入</p> : null}
        {workspaceState === "ready" && workspaces.length === 0 ? (
          <p className="muted-note">暂无工作区，等待后端接入</p>
        ) : null}
        {workspaces.map((workspace) => (
          <button className={`workspace-pill ${workspace.active ? "selected" : ""}`} key={workspace.id} type="button">
            <span className={workspace.active ? "dot green" : "dot gray"} />
            <span>
              <strong>{workspace.name}</strong>
              <small>{workspace.runningCount} 个运行中</small>
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
