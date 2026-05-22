import type { HealthResponse } from "@agentpanels/shared";

export type HealthStatus =
  | { state: "loading"; label: "正在检查后端"; health: null }
  | { state: "healthy"; label: "后端已连接"; health: HealthResponse }
  | { state: "occ-unavailable"; label: "occ 不可用"; health: HealthResponse }
  | { state: "backend-offline"; label: "后端未连接"; health: null };

export async function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const response = await fetch("/api/health", {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Health request failed: ${response.status}`);
  }

  return response.json() as Promise<HealthResponse>;
}

export function toHealthStatus(health: HealthResponse): HealthStatus {
  if (!health.ok || !health.occ.doctor.ok) {
    return { state: "occ-unavailable", label: "occ 不可用", health };
  }

  return { state: "healthy", label: "后端已连接", health };
}
