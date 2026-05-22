import type { FastifyInstance } from "fastify";
import type { LightweightAgent } from "@agentpanels/shared";
import { listAgents } from "../services/agent-service.js";
import type { OccListRunnerOptions } from "../services/occ-list-runner.js";

export async function registerAgentRoutes(app: FastifyInstance, options: OccListRunnerOptions): Promise<void> {
  app.get("/api/agents", async (): Promise<LightweightAgent[]> => listAgents(options));
}
