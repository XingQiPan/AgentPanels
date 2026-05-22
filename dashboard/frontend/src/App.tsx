import { useEffect, useMemo, useState } from "react";
import { getHealth, type HealthStatus, toHealthStatus } from "./api/client";
import { AppShell, type PageKey } from "./components/layout/AppShell";
import { HomePage } from "./pages/HomePage";
import { RunsPage } from "./pages/RunsPage";
import { SessionsPage } from "./pages/SessionsPage";
import { WorkspacesPage } from "./pages/WorkspacesPage";

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
      case "workspace":
        return <WorkspacesPage />;
      case "sessions":
        return <SessionsPage />;
      case "runs":
        return <RunsPage />;
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
