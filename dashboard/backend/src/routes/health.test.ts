import { describe, expect, it } from "vitest";
import { buildServer } from "../index.js";

describe("GET /api/health", () => {
  it("returns occ version and doctor output when occ is healthy", async () => {
    const app = await buildServer({
      occProbe: async () => ({
        path: "E:\\repo\\one-code-cli\\target\\debug\\occ.exe",
        version: "occ 0.1.0",
        doctor: {
          ok: true,
          output: "doctor ok",
        },
      }),
    });

    const response = await app.inject({ method: "GET", url: "/api/health" });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.service).toBe("agentpanels-backend");
    expect(body.timestamp).toEqual(expect.any(String));
    expect(body.occ.path).toBe("E:\\repo\\one-code-cli\\target\\debug\\occ.exe");
    expect(body.occ.version).toBe("occ 0.1.0");
    expect(body.occ.doctor.ok).toBe(true);
    expect(body.occ.doctor.output).toBe("doctor ok");

    await app.close();
  });

  it("returns an unhealthy response when occ is unavailable", async () => {
    const app = await buildServer({
      occProbe: async () => ({
        path: null,
        version: null,
        doctor: {
          ok: false,
          error: "occ executable was not found",
        },
      }),
    });

    const response = await app.inject({ method: "GET", url: "/api/health" });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.ok).toBe(false);
    expect(body.service).toBe("agentpanels-backend");
    expect(body.occ.path).toBeNull();
    expect(body.occ.doctor.ok).toBe(false);

    await app.close();
  });

  it("returns version error details when the version probe fails", async () => {
    const app = await buildServer({
      occProbe: async () => ({
        path: "E:\\repo\\one-code-cli\\target\\debug\\occ.exe",
        version: null,
        versionError: "occ --version exited with code 9",
        doctor: {
          ok: true,
          output: "doctor ok",
        },
      }),
    });

    const response = await app.inject({ method: "GET", url: "/api/health" });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.ok).toBe(false);
    expect(body.occ.version).toBeNull();
    expect(body.occ.versionError).toBe("occ --version exited with code 9");

    await app.close();
  });

  it("returns an unhealthy response when occProbe throws unexpectedly", async () => {
    const app = await buildServer({
      occProbe: async () => {
        throw new Error("probe exploded");
      },
    });

    const response = await app.inject({ method: "GET", url: "/api/health" });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.ok).toBe(false);
    expect(body.occ.path).toBeNull();
    expect(body.occ.version).toBeNull();
    expect(body.occ.doctor.ok).toBe(false);
    expect(body.occ.doctor.error).toBe("occ probe failed: probe exploded");

    await app.close();
  });
});
