import { useEffect, useMemo, useState } from "react";
import { getHealth, type HealthStatus, toHealthStatus } from "./api/client";
import { AppShell, type PageKey } from "./components/layout/AppShell";
import { AgentBuilderPage } from "./pages/AgentBuilderPage";
import { AgentsSkillsPage } from "./pages/AgentsSkillsPage";
import { HomePage } from "./pages/HomePage";
import { SessionDetailPage } from "./pages/SessionDetailPage";

const initialHealth: HealthStatus = { state: "loading", label: "正在检查后端", health: null };

export default function App() {
  const [activePage, setActivePage] = useState<PageKey>("overview");
  const [healthStatus, setHealthStatus] = useState<HealthStatus>(initialHealth);

  useEffect(() => {
    const controller = new AbortController();

    getHealth(controller.signal)
      .then((health) => setHealthStatus(toHealthStatus(health)))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setHealthStatus({ state: "backend-offline", label: "后端未连接", health: null });
      });

    return () => controller.abort();
  }, []);

  const page = useMemo(() => {
    switch (activePage) {
      case "agents":
      case "skills":
      case "workspace":
      case "runs":
        return <AgentsSkillsPage healthStatus={healthStatus} />;
      case "sessions":
        return <SessionDetailPage healthStatus={healthStatus} />;
      case "builder":
        return <AgentBuilderPage healthStatus={healthStatus} />;
      case "settings":
      case "overview":
      default:
        return <HomePage healthStatus={healthStatus} />;
    }
  }, [activePage, healthStatus]);

  return (
    <AppShell activePage={activePage} onNavigate={setActivePage} healthStatus={healthStatus}>
      {page}
    </AppShell>
  );
}
