import { findOccExecutable, runOcc, type OccCommandResult } from "./occ-runner.js";

export type OccListRunnerOptions = {
  repoRoot: string;
  occPath?: string;
  timeoutMs: number;
  env?: NodeJS.ProcessEnv;
  runCommand?: (args: string[]) => Promise<OccCommandResult>;
};

export async function runOccListCommand(args: string[], options: OccListRunnerOptions): Promise<OccCommandResult> {
  if (options.runCommand) {
    return options.runCommand(args);
  }

  const env = {
    ...process.env,
    ...options.env,
    OCC_PATH: options.occPath ?? options.env?.OCC_PATH ?? process.env.OCC_PATH,
  };
  const executable = await findOccExecutable({
    env,
    repoRoot: options.repoRoot,
  });

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
    env,
    timeoutMs: options.timeoutMs,
  });
}
