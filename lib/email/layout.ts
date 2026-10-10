import { APP_NAME } from "@/lib/config";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function textToHtml(text: string): string {
  return text
    .trim()
    .split(/\n{2,}/)
    .map((paragraph) => `<p style="margin:0 0 14px;">${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export type EmailButton = { label: string; href: string; secondary?: boolean };

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

// Email clients ignore <style> tags and modern CSS, hence tables and inline styles.
export function renderEmailLayout(params: {
  preheader: string;
  eyebrow: string;
  heading: string;
  bodyHtml: string;
  buttons?: EmailButton[];
  footer: string;
}): string {
  const buttons = (params.buttons ?? []).map(renderButton).join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<title>${escapeHtml(params.heading)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(params.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f5f7;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background-color:#ffffff;border:1px solid #e4e7ec;border-radius:12px;">
<tr><td style="padding:28px 32px 0;font-family:${FONT};font-size:13px;font-weight:600;color:#4f46e5;">${escapeHtml(params.eyebrow)}</td></tr>
<tr><td style="padding:6px 32px 0;font-family:${FONT};font-size:22px;line-height:1.3;font-weight:700;color:#101828;">${escapeHtml(params.heading)}</td></tr>
<tr><td style="padding:18px 32px 4px;font-family:${FONT};font-size:15px;line-height:1.6;color:#344054;">${params.bodyHtml}</td></tr>
${buttons ? `<tr><td style="padding:4px 32px 12px;">${buttons}</td></tr>` : ""}
<tr><td style="padding:18px 32px 28px;border-top:1px solid #f2f4f7;font-family:${FONT};font-size:12px;line-height:1.5;color:#667085;">${escapeHtml(params.footer)}</td></tr>
</table>
<p style="margin:16px 0 0;font-family:${FONT};font-size:12px;color:#98a2b3;">${escapeHtml(APP_NAME)}</p>
</td></tr>
</table>
</body>
</html>`;
}

function renderButton(button: EmailButton): string {
  const background = button.secondary ? "#ffffff" : "#4f46e5";
  const color = button.secondary ? "#344054" : "#ffffff";
  const border = button.secondary ? "border:1px solid #d0d5dd;" : "";

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 10px;"><tr><td style="border-radius:8px;background-color:${background};${border}"><a href="${escapeHtml(button.href)}" style="display:inline-block;padding:12px 20px;font-family:${FONT};font-size:15px;font-weight:600;color:${color};text-decoration:none;border-radius:8px;">${escapeHtml(button.label)}</a></td></tr></table>`;
}
