import type { FastifyInstance } from "fastify";
import type { ApiErrorResponse, DashboardRun } from "@agentpanels/shared";
import { confirmRun, getRun, listRuns } from "../services/run-store.js";
import { dispatchRun, type RunServiceOptions } from "../services/run-service.js";

type CreateRunBody = {
  workspaceId?: unknown;
  agent?: unknown;
  title?: unknown;
  prompt?: unknown;
};

export async function registerRunRoutes(app: FastifyInstance, options: RunServiceOptions): Promise<void> {
  app.get<{ Querystring: { workspaceId?: string } }>("/api/runs", async (request): Promise<DashboardRun[]> => {
    return listRuns({ dataDir: options.dataDir, workspaceId: request.query.workspaceId });
  });

  app.post<{ Body: CreateRunBody }>("/api/runs", async (request, reply) => {
    const body = request.body ?? {};
    if (
      typeof body.workspaceId !== "string" ||
      typeof body.agent !== "string" ||
      typeof body.title !== "string" ||
      typeof body.prompt !== "string" ||
      body.prompt.trim().length === 0
    ) {
      return reply.status(400).send(apiError("INVALID_RUN_REQUEST", "工作区、Agent、标题和任务内容不能为空", "backend"));
    }

    try {
      return await dispatchRun(
        {
          workspaceId: body.workspaceId,
          agent: body.agent,
          title: body.title,
          prompt: body.prompt,
        },
        options,
      );
    } catch (error) {
      return reply.status(400).send(apiError("RUN_DISPATCH_FAILED", getErrorMessage(error), "backend"));
    }
  });

  app.get<{ Params: { dashboardRunId: string } }>("/api/runs/:dashboardRunId", async (request, reply) => {
    const run = await getRun(request.params.dashboardRunId, { dataDir: options.dataDir });
    if (!run) {
      return reply.status(404).send(apiError("RUN_NOT_FOUND", "运行记录不存在", "backend"));
    }
    return run;
  });

  app.post<{ Params: { dashboardRunId: string } }>("/api/runs/:dashboardRunId/confirm", async (request, reply) => {
    try {
      return await confirmRun(request.params.dashboardRunId, { dataDir: options.dataDir });
    } catch (error) {
      return reply.status(404).send(apiError("RUN_NOT_FOUND", getErrorMessage(error), "backend"));
    }
  });
}

function apiError(
  code: string,
  message: string,
  source: ApiErrorResponse["error"]["source"],
): ApiErrorResponse {
  return {
    ok: false,
    error: {
      code,
      message,
      source,
    },
  };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
