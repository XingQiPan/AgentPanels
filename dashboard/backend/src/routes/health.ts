import type { FastifyInstance } from "fastify";
import type { HealthResponse } from "@agentpanels/shared";
import type { OccProbeResult } from "../services/occ-runner.js";

export type HealthRouteOptions = {
  occProbe: () => Promise<OccProbeResult>;
};

export async function registerHealthRoute(app: FastifyInstance, options: HealthRouteOptions): Promise<void> {
  app.get("/api/health", async (): Promise<HealthResponse> => {
    const occ = await runOccProbeSafely(options.occProbe, app);
    const ok = Boolean(occ.path && occ.version && occ.doctor.ok);

    return {
      ok,
      service: "agentpanels-backend",
      timestamp: new Date().toISOString(),
      occ,
    };
  });
}

async function runOccProbeSafely(
  occProbe: () => Promise<HealthResponse["occ"]>,
  app: FastifyInstance,
): Promise<HealthResponse["occ"]> {
  try {
    return await occProbe();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    app.log.warn({ err: error }, "occ probe failed");

    return {
      path: null,
      version: null,
      doctor: {
        ok: false,
        error: `occ probe failed: ${message}`,
      },
    };
  }
}
