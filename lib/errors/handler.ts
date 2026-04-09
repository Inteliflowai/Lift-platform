import { NextResponse } from "next/server";
import { LiftError } from "./LiftError";

export function standardApiErrorResponse(
  error: unknown,
  fallbackStatus = 500
): NextResponse {
  if (error instanceof LiftError) {
    const status =
      error.code === "VALIDATION_ERROR"
        ? 400
        : error.code === "SESSION_ERROR"
        ? 400
        : error.code === "TENANT_ERROR"
        ? 404
        : fallbackStatus;

    return NextResponse.json(
      { error: error.code, message: error.message },
      { status }
    );
  }

  const message =
    error instanceof Error ? error.message : "An unexpected error occurred";

  return NextResponse.json({ error: "INTERNAL_ERROR", message }, { status: fallbackStatus });
}

export function logError(
  error: unknown,
  context?: Record<string, unknown>
): void {
  const errorObj = error instanceof Error ? error : new Error(String(error));
  const payload = {
    error_code: error instanceof LiftError ? error.code : "UNKNOWN",
    error_message: errorObj.message,
    stack_trace: (errorObj.stack ?? "").slice(0, 2000),
    context,
    timestamp: new Date().toISOString(),
  };

  console.error("[LIFT Error]", payload);

  // In production, also write to audit_logs (fire-and-forget)
  if (process.env.NODE_ENV === "production") {
    import("@/lib/supabase/admin")
      .then(({ supabaseAdmin }) =>
        supabaseAdmin.from("audit_logs").insert({
          action: "system_error",
          payload,
        })
      )
      .catch(() => {}); // never throw from error logger
  }
}

export function isRetryable(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("429") || msg.includes("rate limit")) return true;
    if (msg.includes("503") || msg.includes("service unavailable")) return true;
    if (msg.includes("500") || msg.includes("internal server error")) return true;
    if (msg.includes("502") || msg.includes("bad gateway")) return true;
    if (msg.includes("504") || msg.includes("gateway timeout")) return true;
    if (msg.includes("econnreset") || msg.includes("enotfound") || msg.includes("etimedout"))
      return true;
  }
  return false;
}
