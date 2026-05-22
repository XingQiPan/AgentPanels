import { spawn } from "node:child_process";
import path from "node:path";
import { fileExists as defaultFileExists, getDefaultRepoRoot, getPathEntries } from "./path-utils.js";

export type OccExecutableSource = "env" | "repo" | "path";

export type OccExecutable = {
  path: string;
  source: OccExecutableSource;
};

export type FindOccExecutableOptions = {
  env?: NodeJS.ProcessEnv;
  repoRoot?: string;
  fileExists?: (candidate: string) => Promise<boolean>;
  findOnPath?: (command: string, envPath?: string) => Promise<string | null>;
};

export type OccCommandResult = {
  ok: boolean;
  stdout: string;
  stderr: string;
  output: string;
  exitCode: number | null;
  timedOut: boolean;
  error?: string;
};

export type OccProbeResult = {
  path: string | null;
  version: string | null;
  versionError?: string;
  doctor: {
    ok: boolean;
    output?: string;
    error?: string;
  };
};

export type RunOccOptions = {
  timeoutMs: number;
  env?: NodeJS.ProcessEnv;
  cwd?: string;
  stdin?: string;
};

const REPO_OCC_CANDIDATES = [
  ["one-code-cli", "target", "debug", "occ.exe"],
  ["one-code-cli", "target", "debug", "occ"],
  ["one-code-cli", "npm", "bin", "occ.js"],
];

export async function findOccExecutable(options: FindOccExecutableOptions = {}): Promise<OccExecutable | null> {
  const env = options.env ?? process.env;
  const repoRoot = options.repoRoot ?? getDefaultRepoRoot();
  const exists = options.fileExists ?? defaultFileExists;
  const findOnPath = options.findOnPath ?? findExecutableOnPath;

  if (env.OCC_PATH && (await exists(env.OCC_PATH))) {
    return { path: env.OCC_PATH, source: "env" };
  }

  for (const parts of REPO_OCC_CANDIDATES) {
    const candidate = path.join(repoRoot, ...parts);
    if (await exists(candidate)) {
      return { path: candidate, source: "repo" };
    }
  }

  const pathCandidate = await findOnPath("occ", env.PATH ?? env.Path);
  return pathCandidate ? { path: pathCandidate, source: "path" } : null;
}

export async function findExecutableOnPath(command: string, envPath = process.env.PATH ?? process.env.Path): Promise<string | null> {
  const extensions = process.platform === "win32" ? [".exe", ".cmd", ".bat", ""] : [""];

  for (const entry of getPathEntries(envPath)) {
    for (const extension of extensions) {
      const candidate = path.join(entry, `${command}${extension}`);
      if (await defaultFileExists(candidate)) {
        return candidate;
      }
    }
  }

  return null;
}

export function runOcc(executable: string, args: string[], options: RunOccOptions): Promise<OccCommandResult> {
  return new Promise((resolve) => {
    const command = getOccSpawnCommand(executable, args);
    const child = spawn(command.executable, command.args, {
      cwd: options.cwd,
      env: options.env ?? process.env,
      windowsHide: true,
      windowsVerbatimArguments: command.windowsVerbatimArguments,
      shell: false,
    });

    let stdout = "";
    let stderr = "";
    let settled = false;
    let timedOut = false;

    const finish = (result: Omit<OccCommandResult, "output">) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timer);
      const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
      resolve({ ...result, output });
    };

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
      finish({
        ok: false,
        stdout,
        stderr,
        exitCode: null,
        timedOut,
        error: `occ ${args.join(" ")} timed out after ${options.timeoutMs}ms`,
      });
    }, options.timeoutMs);

    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");
    child.stdout?.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr?.on("data", (chunk: string) => {
      stderr += chunk;
    });

    if (options.stdin !== undefined) {
      child.stdin?.end(options.stdin);
    }

    child.on("error", (error) => {
      finish({
        ok: false,
        stdout,
        stderr,
        exitCode: null,
        timedOut,
        error: error.message,
      });
    });

    child.on("close", (exitCode) => {
      finish({
        ok: exitCode === 0,
        stdout,
        stderr,
        exitCode,
        timedOut,
        error: exitCode === 0 ? undefined : `occ ${args.join(" ")} exited with code ${exitCode}`,
      });
    });
  });
}

function getOccSpawnCommand(executable: string, args: string[]): {
  executable: string;
  args: string[];
  windowsVerbatimArguments?: boolean;
} {
  const extension = path.extname(executable).toLowerCase();

  if (process.platform === "win32" && (extension === ".cmd" || extension === ".bat")) {
    return {
      executable: process.env.ComSpec ?? "cmd.exe",
      args: ["/d", "/s", "/c", buildCmdCommandLine(executable, args)],
      windowsVerbatimArguments: true,
    };
  }

  if (extension === ".js") {
    return {
      executable: process.execPath,
      args: [executable, ...args],
    };
  }

  return {
    executable,
    args,
  };
}

function buildCmdCommandLine(executable: string, args: string[]): string {
  const quotedParts = [executable, ...args].map(quoteForCmd);
  return `"${quotedParts.join(" ")}"`;
}

function quoteForCmd(value: string): string {
  return `"${quoteWindowsArgument(value).replace(/[&|<>^]/g, "^$&")}"`;
}

function quoteWindowsArgument(value: string): string {
  return value.replace(/(\\*)"/g, '$1$1\\"').replace(/\\+$/g, "$&$&");
}

export async function probeOcc(options: {
  env?: NodeJS.ProcessEnv;
  repoRoot?: string;
  timeoutMs: number;
}): Promise<OccProbeResult> {
  const executable = await findOccExecutable({
    env: options.env,
    repoRoot: options.repoRoot,
  });

  if (!executable) {
    return {
      path: null,
      version: null,
      doctor: {
        ok: false,
        error: "occ executable was not found",
      },
    };
  }

  const version = await runOcc(executable.path, ["--version"], {
    timeoutMs: options.timeoutMs,
    env: options.env,
  });
  const doctor = await runOcc(executable.path, ["doctor"], {
    timeoutMs: options.timeoutMs,
    env: options.env,
  });

  return {
    path: executable.path,
    version: version.ok ? version.output : null,
    versionError: version.ok ? undefined : formatCommandError(version),
    doctor: doctor.ok
      ? {
          ok: true,
          output: doctor.output,
        }
      : {
          ok: false,
          output: doctor.output || undefined,
          error: doctor.error,
      },
  };
}

function formatCommandError(result: OccCommandResult): string {
  const error = result.error ?? "occ command failed";
  return result.output ? `${error}: ${result.output}` : error;
}
