import { CheckCircle2 } from "lucide-react";
import type { HealthStatus } from "../api/client";

const pipeline = [
  {
    title: "待分派",
    count: 0,
  },
  {
    title: "执行中",
    count: 0,
  },
  {
    title: "待确认",
    count: 0,
  },
  {
    title: "已完成",
    count: 0,
  },
];

export function HomePage({ healthStatus }: { healthStatus: HealthStatus }) {
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
                <span>{column.count}</span>
              </div>
              <div className="empty-column">等待 M3 接入真实 occ run</div>
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
          <div className="rail-title">路由队列</div>
          <p className="muted-note">M3 接入真实调度后显示队列。</p>
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
