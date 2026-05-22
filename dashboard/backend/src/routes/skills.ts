import type { FastifyInstance } from "fastify";
import type { LightweightSkill } from "@agentpanels/shared";
import type { OccListRunnerOptions } from "../services/occ-list-runner.js";
import { listSkills } from "../services/skill-service.js";

export async function registerSkillRoutes(app: FastifyInstance, options: OccListRunnerOptions): Promise<void> {
  app.get("/api/skills", async (): Promise<LightweightSkill[]> => listSkills(options));
}
