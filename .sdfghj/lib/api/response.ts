import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ErpAuthError } from "@/lib/auth/session";
import { ErpPermissionError } from "@/lib/permissions/middleware";
import { LedgerValidationError } from "@/lib/services/ledger-service";
import { RoznamchaValidationError } from "@/lib/services/roznamcha-service";

export type ApiErrorBody = {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export function apiOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function apiCreated<T>(data: T) {
  return apiOk(data, { status: 201 });
}

export function apiError(code: string, message: string, status = 400, details?: unknown) {
  return NextResponse.json<ApiErrorBody>(
    {
      ok: false,
      error: {
        code,
        message,
        details
      }
    },
    { status }
  );
}

function messageFromError(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected server error";
}

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return apiError("VALIDATION_ERROR", "Request validation failed", 422, error.flatten());
  }

  if (error instanceof ErpAuthError) {
    return apiError("AUTH_REQUIRED", error.message, error.status);
  }

  if (error instanceof ErpPermissionError) {
    return apiError("FORBIDDEN", error.message, error.status);
  }

  if (error instanceof LedgerValidationError) {
    return apiError("LEDGER_VALIDATION_ERROR", error.message, 422);
  }

  if (error instanceof RoznamchaValidationError) {
    return apiError("ROZNAMCHA_VALIDATION_ERROR", error.message, 422);
  }

  return apiError("SERVER_ERROR", messageFromError(error), 500);
}
