import { APP_NAME } from "@/lib/config";
import { formatDateTime, formatPhone, telHref } from "@/lib/format";
import { renderTemplate } from "@/lib/templates/templates";
import { renderEmailLayout, textToHtml } from "./layout";

export type EmailContent = { subject: string; text: string; html: string };

export function buildMissedCallEmail(params: {
  template: { subject: string; body: string };
  businessName: string;
  callerPhone: string;
  calledAt: Date;
  timeZone: string;
  leadUrl?: string;
}): EmailContent {
  const callerDisplay = formatPhone(params.callerPhone);
  const callTime = formatDateTime(params.calledAt, params.timeZone, { withZone: true });
  const vars = { caller_phone: callerDisplay, call_time: callTime, business_name: params.businessName };

  const subject = renderTemplate(params.template.subject, vars);
  const body = renderTemplate(params.template.body, vars);

  const text = [body, "", `Call back: ${callerDisplay}`, ...(params.leadUrl ? [`View in your dashboard: ${params.leadUrl}`] : [])].join("\n");

  const html = renderEmailLayout({
    preheader: `${callerDisplay} called ${params.businessName} · ${callTime}`,
    eyebrow: params.businessName,
    heading: subject,
    bodyHtml: textToHtml(body),
    buttons: [
      { label: `Call ${callerDisplay}`, href: telHref(params.callerPhone) },
      ...(params.leadUrl ? [{ label: "View in dashboard", href: params.leadUrl, secondary: true }] : []),
    ],
    footer: `You're receiving this because ${params.businessName} uses ${APP_NAME} to catch missed calls.`,
  });

  return { subject, text, html };
}

export function buildLoginEmail(params: {
  links: { businessName: string; url: string }[];
  expiresInMinutes: number;
}): EmailContent {
  const single = params.links.length === 1;
  const intro = single
    ? `Use the button below to open the ${params.links[0].businessName} dashboard.`
    : "Your email is connected to more than one business. Choose the dashboard you want to open:";
  const note = `Each link works once and expires in ${params.expiresInMinutes} minutes. If you didn't ask to log in, you can ignore this email.`;

  const text = [intro, "", ...params.links.map((link) => `${link.businessName}: ${link.url}`), "", note].join("\n");

  const html = renderEmailLayout({
    preheader: `Your ${APP_NAME} login link`,
    eyebrow: APP_NAME,
    heading: "Log in to your dashboard",
    bodyHtml: textToHtml(intro),
    buttons: params.links.map((link) => ({ label: single ? "Log in" : `Open ${link.businessName}`, href: link.url })),
    footer: note,
  });

  return { subject: "Your login link", text, html };
}
