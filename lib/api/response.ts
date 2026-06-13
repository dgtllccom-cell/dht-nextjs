import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ErpAuthError, getCurrentErpSession } from "@/lib/auth/session";
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

export function translateToUrdu(message: string): string {
  const msg = message.toLowerCase();
  
  if (msg.includes("does not exist in the referenced users table") || msg.includes("requires a valid user reference")) {
    return "یوزر آئی ڈی ریفرنسڈ یوزرز ٹیبل میں موجود نہیں ہے۔ اس عمل کے لیے ایک درست یوزر ریفرنس درکار ہے۔";
  }
  if (msg.includes("violates foreign key constraint")) {
    if (msg.includes("city_branches_created_by_fkey")) {
      return "ٹیبل 'city_branches' پر فارن کی (Foreign Key) کی خلاف ورزی ہوئی ہے۔ 'created_by' آئی ڈی موجود نہیں ہے۔";
    }
    return "فارن کی (Foreign Key) کی خلاف ورزی ہوئی ہے۔ متعلقہ ریکارڈ ڈیٹا بیس میں موجود نہیں ہے۔";
  }
  if (msg.includes("violates unique constraint")) {
    return "یہ ریکارڈ پہلے سے موجود ہے۔ ڈپلیکیٹ انٹری کی اجازت نہیں ہے۔";
  }
  if (msg.includes("country scope is not allowed")) {
    return "ملک کا دائرہ اختیار مجاز نہیں ہے۔";
  }
  if (msg.includes("main branch not found")) {
    return "مین برانچ نہیں ملی۔";
  }
  if (msg.includes("main branch does not belong to selected country")) {
    return "مین برانچ منتخب کردہ ملک سے تعلق نہیں رکھتی۔";
  }
  if (msg.includes("already exists for this city under the selected main branch")) {
    return "منتخب کردہ مین برانچ کے تحت اس شہر کے لیے سٹی برانچ پہلے سے موجود ہے۔";
  }
  if (msg.includes("request validation failed")) {
    return "درخواست کی تصدیق (Validation) ناکام ہو گئی۔";
  }
  
  // Generic matches
  if (msg.includes("not found")) {
    return `مطلوبہ ریکارڈ نہیں ملا: ${message}`;
  }
  if (msg.includes("is required")) {
    return `یہ فیلڈ لازمی ہے: ${message}`;
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
    finalMessage = `بھائی اس میں یہ خرابی ہے: ${urduTranslation}`;
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

export async function handleApiError(error: unknown) {
  let isSuperAdmin = false;
  try {
    const session = await getCurrentErpSession();
    if (session?.isSuperAdmin) {
      isSuperAdmin = true;
    }
  } catch {
    // ignore session resolution failures in non-request contexts
  }

  if (error instanceof ZodError) {
    return apiError("VALIDATION_ERROR", "Request validation failed", 422, error.flatten(), isSuperAdmin);
  }

  if (error instanceof ErpAuthError) {
    return apiError("AUTH_REQUIRED", error.message, error.status, undefined, isSuperAdmin);
  }

  if (error instanceof ErpPermissionError) {
    return apiError("FORBIDDEN", error.message, error.status, undefined, isSuperAdmin);
  }

  if (error instanceof LedgerValidationError) {
    return apiError("LEDGER_VALIDATION_ERROR", error.message, 422, undefined, isSuperAdmin);
  }

  if (error instanceof RoznamchaValidationError) {
    return apiError("ROZNAMCHA_VALIDATION_ERROR", error.message, 422, undefined, isSuperAdmin);
  }

  return apiError("SERVER_ERROR", messageFromError(error), 500, undefined, isSuperAdmin);
}

