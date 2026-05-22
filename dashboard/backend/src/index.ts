import { fileURLToPath } from "node:url";
import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import { getConfig, type AppConfig } from "./config.js";
import { registerAgentRoutes } from "./routes/agents.js";
import { registerHealthRoute } from "./routes/health.js";
import { registerRunRoutes } from "./routes/runs.js";
import { registerSkillRoutes } from "./routes/skills.js";
import { registerWorkspaceRoutes } from "./routes/workspaces.js";
import { probeOcc, type OccProbeResult } from "./services/occ-runner.js";
import type { RunServiceOptions } from "./services/run-service.js";

export type BuildServerOptions = {
  config?: Partial<AppConfig>;
  occProbe?: () => Promise<OccProbeResult>;
  runCommand?: RunServiceOptions["runCommand"];
};

export async function buildServer(options: BuildServerOptions = {}): Promise<FastifyInstance> {
  const baseConfig = getConfig();
  const config = { ...baseConfig, ...options.config };
  const app = Fastify({
    logger: true,
  });

  await app.register(cors, {
    origin: config.corsOrigins,
  });

  await registerHealthRoute(app, {
    occProbe:
      options.occProbe ??
      (() =>
        probeOcc({
          env: { ...process.env, OCC_PATH: config.occPath ?? process.env.OCC_PATH },
          repoRoot: config.repoRoot,
          timeoutMs: config.occTimeoutMs,
        })),
  });

  await registerWorkspaceRoutes(app, {
    repoRoot: config.repoRoot,
    dataDir: config.dataDir,
  });

  const occListOptions = {
    repoRoot: config.repoRoot,
    occPath: config.occPath,
    timeoutMs: config.occTimeoutMs,
    env: { ...process.env, OCC_PATH: config.occPath ?? process.env.OCC_PATH },
  };

  await registerAgentRoutes(app, occListOptions);
  await registerSkillRoutes(app, occListOptions);
  await registerRunRoutes(app, {
    ...occListOptions,
    dataDir: config.dataDir,
    runCommand: options.runCommand,
  });

  return app;
}

async function main(): Promise<void> {
  const config = getConfig();
  const app = await buildServer({ config });

  await app.listen({
    host: config.host,
    port: config.port,
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
