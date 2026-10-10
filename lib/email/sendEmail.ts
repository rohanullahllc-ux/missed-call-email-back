import { APP_NAME } from "@/lib/config";
import { resend } from "./client";

export type SendEmailResult = { ok: true; providerMessageId: string } | { ok: false; error: string };

export async function sendEmail(params: { to: string; subject: string; text: string; html?: string }): Promise<SendEmailResult> {
  const fromAddress = process.env.RESEND_FROM_EMAIL;
  if (!fromAddress) {
    return { ok: false, error: "RESEND_FROM_EMAIL is not configured" };
  }

  try {
    const result = await resend.emails.send({
      from: fromAddress.includes("<") ? fromAddress : `${APP_NAME} <${fromAddress}>`,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });

    if (result.error) {
      return { ok: false, error: result.error.message };
    }
    if (!result.data) {
      return { ok: false, error: "Resend returned no data and no error" };
    }

    return { ok: true, providerMessageId: result.data.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
