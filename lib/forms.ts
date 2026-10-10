export type ActionResult =
  | { ok: true; message: string; at: number }
  | { ok: false; error: string; at: number }
  | null;

export type FormAction = (previous: ActionResult, formData: FormData) => Promise<ActionResult>;

export function succeeded(message: string): ActionResult {
  return { ok: true, message, at: Date.now() };
}

export function failed(error: string): ActionResult {
  return { ok: false, error, at: Date.now() };
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_PATTERN = /^\+[1-9]\d{7,14}$/;

export function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}
