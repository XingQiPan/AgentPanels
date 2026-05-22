import type { ReactNode } from "react";
import type { HealthStatus } from "../../api/client";
import { LeftNavigation } from "./LeftNavigation";
import { TopCommandBar } from "./TopCommandBar";

export type PageKey = "overview" | "workspace" | "sessions" | "runs";

type AppShellProps = {
  activePage: PageKey;
  children: ReactNode;
  healthStatus: HealthStatus;
  onNavigate: (page: PageKey) => void;
};

export function AppShell({ activePage, children, healthStatus, onNavigate }: AppShellProps) {
  return (
    <div className="app-shell">
      <LeftNavigation activePage={activePage} onNavigate={onNavigate} healthStatus={healthStatus} />
      <div className="app-main">
        <TopCommandBar healthStatus={healthStatus} />
        <main className="page-frame">{children}</main>
      </div>
    </div>
  );
}
