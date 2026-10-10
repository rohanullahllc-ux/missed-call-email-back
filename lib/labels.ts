export type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "brand";

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type Label = { label: string; tone: Tone };

export const LEAD_STATUSES: Record<string, Label> = {
  new: { label: "New", tone: "info" },
  notified: { label: "Needs callback", tone: "warning" },
  converted: { label: "Won", tone: "success" },
  closed: { label: "Closed", tone: "neutral" },
};

export const CALL_OUTCOMES: Record<string, Label> = {
  ringing: { label: "Ringing", tone: "info" },
  answered: { label: "Answered", tone: "success" },
  missed: { label: "Missed", tone: "danger" },
};

export const TENANT_STATUSES: Record<string, Label & { description: string }> = {
  active: { label: "Active", tone: "success", description: "Calls forward and missed-call emails are sent." },
  trial: { label: "Trial", tone: "info", description: "Same as active — useful for tracking businesses on a free trial." },
  paused: { label: "Paused", tone: "warning", description: "Calls still forward, but no missed-call emails are sent." },
};

export const EMAIL_STATUSES: Record<string, Label> = {
  sent: { label: "Email sent", tone: "success" },
  failed: { label: "Email failed", tone: "danger" },
};

export function labelFor(map: Record<string, Label>, key: string): Label {
  return map[key] ?? { label: key, tone: "neutral" };
}
