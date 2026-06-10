import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { z } from "zod";
import { server } from "@/test/server";
import { ApiError, apiRequest } from "./client";

describe("apiRequest", () => {
  it("validates a successful response with the supplied schema", async () => {
    server.use(
      http.get("/api/thing", () => HttpResponse.json({ value: 42 })),
    );
    const data = await apiRequest("/api/thing", {
      schema: z.object({ value: z.number() }),
    });
    expect(data).toEqual({ value: 42 });
  });

  it("parses FastAPI AppError detail shape", async () => {
    server.use(
      http.post("/api/thing", () =>
        HttpResponse.json(
          { detail: { message: "Already running", error_code: "ENV_RUNNING" } },
          { status: 409 },
        ),
      ),
    );
    const err = await apiRequest("/api/thing", { method: "POST" }).catch(
      (e) => e,
    );
    expect(err).toBeInstanceOf(ApiError);
    expect(err.message).toBe("Already running");
    expect(err.errorCode).toBe("ENV_RUNNING");
    expect(err.isConflict).toBe(true);
  });

  it("parses FastAPI validation error arrays", async () => {
    server.use(
      http.post("/api/thing", () =>
        HttpResponse.json(
          { detail: [{ loc: ["body", "mount_folder"], msg: "field required" }] },
          { status: 422 },
        ),
      ),
    );
    const err = await apiRequest("/api/thing", { method: "POST" }).catch(
      (e) => e,
    );
    expect(err).toBeInstanceOf(ApiError);
    expect(err.message).toContain("mount_folder");
  });

  it("parses generic string detail", async () => {
    server.use(
      http.get("/api/thing", () =>
        HttpResponse.json({ detail: "Internal Server Error" }, { status: 500 }),
      ),
    );
    const err = await apiRequest("/api/thing").catch((e) => e);
    expect(err.message).toBe("Internal Server Error");
  });

  it("handles empty bodies for schema-less requests", async () => {
    server.use(
      http.delete("/api/thing", () => new HttpResponse(null, { status: 204 })),
    );
    await expect(
      apiRequest("/api/thing", { method: "DELETE" }),
    ).resolves.toBeUndefined();
  });

  it("throws when the response does not match the schema", async () => {
    server.use(
      http.get("/api/thing", () => HttpResponse.json({ value: "nope" })),
    );
    const err = await apiRequest("/api/thing", {
      schema: z.object({ value: z.number() }),
    }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
  });
});
