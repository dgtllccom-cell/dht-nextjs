import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ErpAuthError, getCurrentErpSession } from "@/lib/auth/session";
import { ErpPermissionError } from "@/lib/permissions/middleware";
import { LedgerValidationError } from "@/lib/services/ledger-service";
import { recordEnterpriseMultilingualEvent } from "@/lib/services/enterprise-multilingual-service";
import { RoznamchaValidationError } from "@/lib/services/roznamcha-service";

export type ApiErrorBody = {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export function translateToUrdu(message: string): string {
  const msg = message.toLowerCase();

  if (msg.includes("does not exist in the referenced users table") || msg.includes("requires a valid user reference")) {
    return "یوزر آئی ڈی متعلقہ users table میں موجود نہیں ہے۔ اس عمل کے لیے درست یوزر reference ضروری ہے۔";
  }
  if (msg.includes("violates foreign key constraint")) {
    if (msg.includes("city_branches_created_by_fkey")) {
      return "City Branch record میں created_by user reference موجود نہیں ہے۔ پہلے درست user/profile بنائیں یا session user درست کریں۔";
    }
    return "Foreign key constraint کی خلاف ورزی ہوئی ہے۔ متعلقہ record database میں موجود نہیں ہے۔";
  }
  if (msg.includes("violates unique constraint")) {
    return "یہ record پہلے سے موجود ہے۔ duplicate entry کی اجازت نہیں ہے۔";
  }
  if (msg.includes("country scope is not allowed")) {
    return "اس user کو منتخب ملک کے data تک رسائی کی اجازت نہیں ہے۔";
  }
  if (msg.includes("main branch not found")) {
    return "Main Branch نہیں ملی۔";
  }
  if (msg.includes("main branch does not belong to selected country")) {
    return "منتخب Main Branch اس country سے تعلق نہیں رکھتی۔";
  }
  if (msg.includes("already exists for this city under the selected main branch")) {
    return "اس city کے لیے منتخب Main Branch کے تحت City Branch پہلے سے موجود ہے۔";
  }
  if (msg.includes("request validation failed")) {
    return "درخواست کی validation ناکام ہو گئی۔ required fields اور data format چیک کریں۔";
  }
  if (msg.includes("authentication is required")) {
    return "لاگ اِن ضروری ہے۔ براہِ کرم دوبارہ لاگ اِن کریں۔";
  }
  if (msg.includes("not found")) {
    return `مطلوبہ record نہیں ملا: ${message}`;
  }
  if (msg.includes("is required")) {
    return `یہ field لازمی ہے: ${message}`;
  }

  return message;
}

export function apiOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function apiCreated<T>(data: T) {
  return apiOk(data, { status: 201 });
}

export function apiError(code: string, message: string, status = 400, details?: unknown, isSuperAdmin = false) {
  let finalMessage = message;
  if (isSuperAdmin) {
    const urduTranslation = translateToUrdu(message);
    finalMessage = `بھائی، اس میں یہ خرابی ہے: ${urduTranslation}`;
  }

  return NextResponse.json<ApiErrorBody>(
    {
      ok: false,
      error: {
        code,
        message: finalMessage,
        details
      }
    },
    { status }
  );
}

function messageFromError(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected server error";
}

async function logApiErrorForSuperAdmin(code: string, message: string, details?: unknown) {
  let isSuperAdmin = false;
  try {
    const session = await getCurrentErpSession();
    if (!session) return { isSuperAdmin };
    isSuperAdmin = session.isSuperAdmin;

    try {
      await recordEnterpriseMultilingualEvent(session, {
        eventType: "system.error",
        severity: "error",
        sourceModule: "api",
        message,
        messageLanguage: "en",
        payload: { code, details },
        notifyEmail: session.isSuperAdmin,
        notifyMobile: false
      });
    } catch {
      // The API response must not fail if multilingual logging migration is not applied yet.
    }
  } catch {
    isSuperAdmin = false;
  }

  return { isSuperAdmin };
}

export async function handleApiError(error: unknown) {
  let code = "SERVER_ERROR";
  let message = messageFromError(error);
  let status = 500;
  let details: unknown;

  if (error instanceof ZodError) {
    code = "VALIDATION_ERROR";
    message = "Request validation failed";
    status = 422;
    details = error.flatten();
  } else if (error instanceof ErpAuthError) {
    code = "AUTH_REQUIRED";
    message = error.message;
    status = error.status;
  } else if (error instanceof ErpPermissionError) {
    code = "FORBIDDEN";
    message = error.message;
    status = error.status;
  } else if (error instanceof LedgerValidationError) {
    code = "LEDGER_VALIDATION_ERROR";
    message = error.message;
    status = 422;
  } else if (error instanceof RoznamchaValidationError) {
    code = "ROZNAMCHA_VALIDATION_ERROR";
    message = error.message;
    status = 422;
  }

  const { isSuperAdmin } = await logApiErrorForSuperAdmin(code, message, details);
  
  try {
    const fs = require("fs");
    fs.appendFileSync(
      "C:\\Users\\dgtll\\.gemini\\antigravity-ide\\scratch\\error_logs.txt", 
      new Date().toISOString() + " - " + code + " - " + message + " - " + JSON.stringify(details || {}) + "\n"
    );
  } catch (e) {}

  return apiError(code, message, status, details, isSuperAdmin);
}

