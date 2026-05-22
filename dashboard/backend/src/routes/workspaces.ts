import type { FastifyInstance } from "fastify";
import type { ApiErrorResponse, DashboardWorkspace } from "@agentpanels/shared";
import { activateWorkspace, addWorkspace, listWorkspaces } from "../services/workspace-store.js";

export type WorkspaceRouteOptions = {
  repoRoot: string;
  dataDir: string;
};

type AddWorkspaceBody = {
  name?: unknown;
  path?: unknown;
};

export async function registerWorkspaceRoutes(app: FastifyInstance, options: WorkspaceRouteOptions): Promise<void> {
  app.get("/api/workspaces", async (): Promise<DashboardWorkspace[]> => listWorkspaces(options));

  app.post<{ Body: AddWorkspaceBody }>("/api/workspaces", async (request, reply) => {
    const body = request.body ?? {};
    if (typeof body.name !== "string" || typeof body.path !== "string") {
      return reply.status(400).send(apiError("INVALID_WORKSPACE", "工作区名称和路径不能为空", "backend"));
    }

    try {
      return await addWorkspace({ name: body.name, path: body.path }, options);
    } catch (error) {
      return reply
        .status(400)
        .send(apiError("WORKSPACE_PATH_INVALID", getErrorMessage(error), "filesystem"));
    }
  });

  app.post<{ Params: { id: string } }>("/api/workspaces/:id/activate", async (request, reply) => {
    try {
      return await activateWorkspace(request.params.id, options);
    } catch (error) {
      return reply.status(404).send(apiError("WORKSPACE_NOT_FOUND", getErrorMessage(error), "backend"));
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
