import { useEffect, useState } from "react";
import type { DashboardRun } from "@agentpanels/shared";
import { getRuns } from "../api/client";

export function RunsPage() {
  const [runs, setRuns] = useState<DashboardRun[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "unavailable">("loading");

  useEffect(() => {
    const controller = new AbortController();
    getRuns(undefined, controller.signal)
      .then((items) => {
        setRuns(items);
        setState("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setState("unavailable");
      });

    return () => controller.abort();
  }, []);

  return (
    <section className="panel placeholder-page">
      <h1>运行记录</h1>
      {state === "loading" ? <p className="muted-note">正在加载真实运行记录...</p> : null}
      {state === "unavailable" ? <p className="muted-note">运行记录接口不可用。</p> : null}
      {state === "ready" && runs.length === 0 ? <p className="muted-note">暂无运行记录。</p> : null}
      {runs.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>标题</th>
              <th>Agent</th>
              <th>状态</th>
              <th>occ run</th>
              <th>更新时间</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr key={run.dashboardRunId}>
                <td>{run.title}</td>
                <td>{run.agent}</td>
                <td>{run.status}</td>
                <td>{run.occRunId ?? "-"}</td>
                <td>{new Date(run.updatedAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </section>
  );
}
