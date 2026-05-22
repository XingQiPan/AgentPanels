import { findOccExecutable, runOcc, type OccCommandResult } from "./occ-runner.js";
import { createRun, statusFromOccSuccess, updateRun } from "./run-store.js";
import { listWorkspaces } from "./workspace-store.js";
import type { DashboardRun } from "@agentpanels/shared";

export type DispatchRunInput = {
  workspaceId: string;
  agent: string;
  title: string;
  prompt: string;
};

export type RunCommandOptions = {
  cwd: string;
  stdin: string;
};

export type RunServiceOptions = {
  repoRoot: string;
  dataDir: string;
  timeoutMs: number;
  occPath?: string;
  env?: NodeJS.ProcessEnv;
  runCommand?: (args: string[], options: RunCommandOptions) => Promise<OccCommandResult>;
};

type OccRunJson = {
  success?: unknown;
  run_id?: unknown;
  session_id?: unknown;
  result_path?: unknown;
  stdout_path?: unknown;
  stderr_path?: unknown;
  error?: { message?: unknown } | unknown;
};

export async function dispatchRun(input: DispatchRunInput, options: RunServiceOptions): Promise<DashboardRun> {
  const workspace = await findWorkspace(input.workspaceId, options);
  const run = await createRun(input, options);
  await updateRun(run.dashboardRunId, { status: "running" }, options);

  const args = [
    "run",
    "--agent",
    input.agent,
    "--cwd",
    workspace.path,
    "--stdin",
    "--non-interactive",
    "--stream",
    "--output",
    "json",
  ];

  const result = await runOccCommand(args, { cwd: workspace.path, stdin: input.prompt }, options);
  if (!result.ok) {
    return updateRun(
      run.dashboardRunId,
      {
        status: "failed",
        error: formatCommandError(result),
      },
      options,
    );
  }

  const parsed = parseOccRunJson(result.stdout || result.output);
  const success = parsed.success === true;
  return updateRun(
    run.dashboardRunId,
    {
      status: statusFromOccSuccess(success),
      occRunId: typeof parsed.run_id === "string" ? parsed.run_id : null,
      sessionId: typeof parsed.session_id === "string" ? parsed.session_id : null,
      resultPath: typeof parsed.result_path === "string" ? parsed.result_path : null,
      stdoutPath: typeof parsed.stdout_path === "string" ? parsed.stdout_path : null,
      stderrPath: typeof parsed.stderr_path === "string" ? parsed.stderr_path : null,
      error: success ? null : getOccErrorMessage(parsed) ?? "occ run returned success=false",
    },
    options,
  );
}

async function findWorkspace(workspaceId: string, options: RunServiceOptions) {
  const workspaces = await listWorkspaces(options);
  const workspace = workspaces.find((item) => item.id === workspaceId);
  if (!workspace) {
    throw new Error(`Workspace not found: ${workspaceId}`);
  }
  return workspace;
}

async function runOccCommand(
  args: string[],
  commandOptions: RunCommandOptions,
  options: RunServiceOptions,
): Promise<OccCommandResult> {
  if (options.runCommand) {
    return options.runCommand(args, commandOptions);
  }

  const env = {
    ...process.env,
    ...options.env,
    OCC_PATH: options.occPath ?? options.env?.OCC_PATH ?? process.env.OCC_PATH,
  };
  const executable = await findOccExecutable({ env, repoRoot: options.repoRoot });
  if (!executable) {
    return {
      ok: false,
      stdout: "",
      stderr: "",
      output: "",
      exitCode: null,
      timedOut: false,
      error: "occ executable was not found",
    };
  }

  return runOcc(executable.path, args, {
    cwd: commandOptions.cwd,
    env,
    stdin: commandOptions.stdin,
    timeoutMs: options.timeoutMs,
  });
}

function parseOccRunJson(value: string): OccRunJson {
  try {
    return JSON.parse(value) as OccRunJson;
  } catch {
    return { success: false, error: { message: `Failed to parse occ JSON output: ${value}` } };
  }
}

function formatCommandError(result: OccCommandResult): string {
  const message = result.error ?? "occ run failed";
  return result.output ? `${message}: ${result.output}` : message;
}

function getOccErrorMessage(value: OccRunJson): string | null {
  if (value.error && typeof value.error === "object" && "message" in value.error) {
    const message = (value.error as { message?: unknown }).message;
    return typeof message === "string" ? message : null;
  }
  return null;
}
