import { getDefaultRepoRoot } from "./services/path-utils.js";

export type AppConfig = {
  host: string;
  port: number;
  repoRoot: string;
  occPath?: string;
  occTimeoutMs: number;
  corsOrigins: string[];
};

const DEFAULT_PORT = 43110;
const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_OCC_TIMEOUT_MS = 5000;

export function getConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    host: env.HOST ?? DEFAULT_HOST,
    port: parsePort(env.PORT, DEFAULT_PORT),
    repoRoot: env.AGENTPANELS_REPO_ROOT ?? getDefaultRepoRoot(),
    occPath: env.OCC_PATH,
    occTimeoutMs: parsePort(env.OCC_TIMEOUT_MS, DEFAULT_OCC_TIMEOUT_MS),
    corsOrigins: parseCorsOrigins(env.CORS_ORIGINS),
  };
}

function parsePort(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseCorsOrigins(value: string | undefined): string[] {
  if (value) {
    return value
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  return [
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    "http://127.0.0.1:5174",
    "http://localhost:5174",
    "http://127.0.0.1:43111",
    "http://localhost:43111",
  ];
}
