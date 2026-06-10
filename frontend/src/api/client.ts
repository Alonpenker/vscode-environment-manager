import type { z } from "zod";

/**
 * Typed frontend error raised for any non-2xx API response or parse failure.
 * Carries the HTTP status, a user-facing message, and an optional backend
 * error code (e.g. ENVIRONMENT_ALREADY_RUNNING).
 */
export class ApiError extends Error {
  readonly status: number;
  readonly errorCode?: string;

  constructor(message: string, status: number, errorCode?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errorCode = errorCode;
  }

  /** 409 conflicts are non-fatal lifecycle states (already running/stopped). */
  get isConflict(): boolean {
    return this.status === 409;
  }
}

interface FastApiAppErrorDetail {
  message: string;
  error_code: string;
}

interface FastApiValidationItem {
  loc?: (string | number)[];
  msg?: string;
}

/**
 * Extracts a human-readable message + optional error code from a parsed
 * FastAPI error body. Handles three shapes:
 *  - AppError:        { detail: { message, error_code } }
 *  - Validation:      { detail: [{ loc, msg }, ...] }
 *  - Generic string:  { detail: "Internal Server Error" }
 */
function parseErrorBody(
  body: unknown,
  status: number,
): { message: string; errorCode?: string } {
  if (body && typeof body === "object" && "detail" in body) {
    const detail = (body as { detail: unknown }).detail;

    if (detail && typeof detail === "object" && !Array.isArray(detail)) {
      const appDetail = detail as Partial<FastApiAppErrorDetail>;
      if (typeof appDetail.message === "string") {
        return {
          message: appDetail.message,
          errorCode:
            typeof appDetail.error_code === "string"
              ? appDetail.error_code
              : undefined,
        };
      }
    }

    if (Array.isArray(detail)) {
      const messages = (detail as FastApiValidationItem[])
        .map((item) => {
          const field = Array.isArray(item.loc)
            ? item.loc[item.loc.length - 1]
            : undefined;
          return field ? `${field}: ${item.msg ?? "invalid"}` : item.msg;
        })
        .filter(Boolean);
      if (messages.length > 0) {
        return { message: messages.join("; ") };
      }
    }

    if (typeof detail === "string") {
      return { message: detail };
    }
  }

  return { message: `Request failed with status ${status}` };
}

interface RequestOptions<TSchema extends z.ZodTypeAny | undefined> {
  method?: string;
  body?: unknown;
  schema?: TSchema;
  signal?: AbortSignal;
}

type Parsed<TSchema extends z.ZodTypeAny | undefined> =
  TSchema extends z.ZodTypeAny ? z.infer<TSchema> : undefined;

/**
 * Shared request helper. Uses same-origin relative URLs, sends/receives JSON,
 * handles empty bodies, parses FastAPI error shapes, validates successful
 * responses with the supplied Zod schema, and throws a typed {@link ApiError}.
 */
export async function apiRequest<TSchema extends z.ZodTypeAny | undefined>(
  url: string,
  options: RequestOptions<TSchema> = {},
): Promise<Parsed<TSchema>> {
  const { method = "GET", body, schema, signal } = options;

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      signal,
      headers: body !== undefined ? { "Content-Type": "application/json" } : {},
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") {
      throw cause;
    }
    throw new ApiError(
      "Unable to reach the server. Check your connection and try again.",
      0,
    );
  }

  const rawText = await response.text();
  let parsedBody: unknown = undefined;
  if (rawText.length > 0) {
    try {
      parsedBody = JSON.parse(rawText);
    } catch {
      parsedBody = rawText;
    }
  }

  if (!response.ok) {
    const { message, errorCode } = parseErrorBody(parsedBody, response.status);
    throw new ApiError(message, response.status, errorCode);
  }

  if (!schema) {
    return undefined as Parsed<TSchema>;
  }

  const result = schema.safeParse(parsedBody);
  if (!result.success) {
    throw new ApiError(
      "The server returned data in an unexpected format.",
      response.status,
    );
  }
  return result.data as Parsed<TSchema>;
}
