import { CheckCircle2, ClipboardList, Send } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { DashboardRun, RunStatus } from "@agentpanels/shared";
import { confirmRun, createRun, getRuns, getWorkspaces, type HealthStatus, type WorkspaceSummary } from "../api/client";

const pipeline: Array<{ title: string; statuses: RunStatus[] }> = [
  { title: "待分派", statuses: ["queued"] },
  { title: "执行中", statuses: ["running"] },
  { title: "待确认", statuses: ["confirming"] },
  { title: "已完成", statuses: ["success", "failed"] },
];

const statusLabels: Record<RunStatus, string> = {
  queued: "待分派",
  running: "执行中",
  confirming: "待确认",
  success: "成功",
  failed: "失败",
};

export function HomePage({ healthStatus }: { healthStatus: HealthStatus }) {
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [runs, setRuns] = useState<DashboardRun[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "unavailable">("loading");
  const [agent, setAgent] = useState("codex");
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const activeWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.active) ?? workspaces[0] ?? null,
    [workspaces],
  );

  async function refresh(signal?: AbortSignal) {
    const workspaceItems = await getWorkspaces(signal);
    setWorkspaces(workspaceItems);
    const active = workspaceItems.find((workspace) => workspace.active) ?? workspaceItems[0];
    setRuns(active ? await getRuns(active.id, signal) : []);
    setState("ready");
  }

  useEffect(() => {
    const controller = new AbortController();
    refresh(controller.signal).catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      setState("unavailable");
    });

    return () => controller.abort();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeWorkspace || !prompt.trim()) {
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      const nextRun = await createRun({
        workspaceId: activeWorkspace.id,
        agent,
        title: title.trim() || prompt.trim().slice(0, 40),
        prompt,
      });
      setRuns((current) => [nextRun, ...current.filter((run) => run.dashboardRunId !== nextRun.dashboardRunId)]);
      setTitle("");
      setPrompt("");
      setMessage("任务已分派，等待确认或查看运行记录。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirm(runId: string) {
    const updated = await confirmRun(runId);
    setRuns((current) => current.map((run) => (run.dashboardRunId === runId ? updated : run)));
  }

  return (
    <div className="dashboard-grid">
      <section className="panel pipeline-panel">
        <div className="panel-header">
          <div>
            <h1>运行流水线</h1>
            <p>主 Agent 将任务拆分后，按状态推进到执行与确认。</p>
          </div>
        </div>
        <div className="kanban">
          {pipeline.map((column) => (
            <article className="kanban-column" key={column.title}>
              <div className="column-title">
                <h2>{column.title}</h2>
                <span>{runs.filter((run) => column.statuses.includes(run.status)).length}</span>
              </div>
              {runs
                .filter((run) => column.statuses.includes(run.status))
                .map((run) => (
                  <div className="task-card" key={run.dashboardRunId}>
                    <div className="task-title">
                      <ClipboardList size={18} />
                      <strong>{run.title}</strong>
                    </div>
                    <p>{run.agent}</p>
                    <code>{run.occRunId ?? run.dashboardRunId}</code>
                    <div className="task-meta">
                      <span className={run.status === "success" ? "tag success" : "tag"}>{statusLabels[run.status]}</span>
                      <small>{new Date(run.updatedAt).toLocaleTimeString()}</small>
                    </div>
                    {run.error ? <p className="muted-note">{run.error}</p> : null}
                    <div className="task-actions">
                      <button className="ghost-button compact" disabled type="button">
                        查看结果
                      </button>
                      <button className="ghost-button compact" disabled type="button">
                        查看日志
                      </button>
                      <button
                        className="ghost-button compact"
                        disabled={run.status !== "confirming"}
                        onClick={() => handleConfirm(run.dashboardRunId)}
                        type="button"
                      >
                        确认完成
                      </button>
                    </div>
                  </div>
                ))}
              {runs.filter((run) => column.statuses.includes(run.status)).length === 0 ? (
                <div className="empty-column">{state === "loading" ? "正在加载真实运行记录" : "暂无运行记录"}</div>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <aside className="panel right-rail">
        <div className="rail-header">
          <h2>主 Agent 调度</h2>
          <span className="online">在线</span>
        </div>
        <section className="rail-card">
          <div className="rail-title">新建任务</div>
          <form className="dispatch-form" onSubmit={handleSubmit}>
            <label>
              工作区
              <select disabled value={activeWorkspace?.id ?? ""}>
                <option>{activeWorkspace ? activeWorkspace.name : "暂无工作区"}</option>
              </select>
            </label>
            <label>
              Agent
              <select onChange={(event) => setAgent(event.target.value)} value={agent}>
                <option value="codex">codex</option>
                <option value="claude">claude</option>
                <option value="opencode">opencode</option>
                <option value="gemini">gemini</option>
              </select>
            </label>
            <label>
              标题
              <input onChange={(event) => setTitle(event.target.value)} placeholder="可选，默认取任务前 40 字" value={title} />
            </label>
            <label>
              任务内容
              <textarea onChange={(event) => setPrompt(event.target.value)} placeholder="描述要交给 occ 的任务" value={prompt} />
            </label>
            <button className="primary-button full" disabled={!activeWorkspace || !prompt.trim() || submitting} type="submit">
              <Send size={16} />
              {submitting ? "分派中" : "分派任务"}
            </button>
            {message ? <p className="muted-note">{message}</p> : null}
            {state === "unavailable" ? <p className="muted-note">运行记录接口不可用</p> : null}
          </form>
        </section>
        <section className="rail-card">
          <div className="rail-title">路由队列</div>
          <p className="muted-note">
            当前工作区有 {runs.filter((run) => run.status === "queued" || run.status === "running").length} 个待处理运行。
          </p>
        </section>
        <section className="rail-card">
          <div className="rail-title">后端 / occ 健康</div>
          <div className={`health-card ${healthStatus.state}`}>
            <CheckCircle2 size={18} />
            <div>
              <strong>{healthStatus.label}</strong>
              <small>{healthStatus.health?.occ.version ?? "等待 /api/health 响应"}</small>
            </div>
          </div>
        </section>
        <section className="rail-card">
          <div className="rail-title">分派预设</div>
          <p className="muted-note">M2 接入真实 Agent / Skill 后显示。</p>
        </section>
        <section className="rail-card">
          <div className="rail-title">执行器状态</div>
          <p className="muted-note">M2 接入真实执行器后显示。</p>
        </section>
      </aside>

      <section className="panel events-panel">
        <div className="panel-header slim">
          <h2>实时事件流</h2>
          <span className="online">实时</span>
        </div>
        <div className="event-list">
          <p className="muted-note">M3 接入 SSE 后显示真实运行事件。</p>
        </div>
      </section>
    </div>
  );
}
