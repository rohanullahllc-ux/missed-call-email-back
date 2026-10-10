import Mustache from "mustache";
import { prisma } from "@/lib/db/client";

export const TRIGGERS = {
  missed_call: {
    label: "Missed call",
    description: "Sent when a call is missed during business hours — or any time, if there's no after-hours template.",
    whenOff: "When turned off, the built-in default wording is used instead.",
    defaults: {
      subject: "Missed call from {{caller_phone}}",
      body: "You missed a call from {{caller_phone}} at {{call_time}}.\n\nCall them back soon — the faster you reply, the more likely you are to win the job.",
    },
  },
  missed_call_after_hours: {
    label: "After-hours missed call",
    description: "Sent instead when a call is missed outside the business hours you've set.",
    whenOff: "When turned off, after-hours calls use the Missed call template.",
    defaults: {
      subject: "After-hours call from {{caller_phone}}",
      body: "{{caller_phone}} called at {{call_time}}, outside your business hours.\n\nGive them a call back first thing when you open.",
    },
  },
} as const;

export type TriggerType = keyof typeof TRIGGERS;

export const TRIGGER_TYPES = Object.keys(TRIGGERS) as TriggerType[];

export const TEMPLATE_VARIABLES = [
  { name: "caller_phone", description: "The caller's phone number" },
  { name: "call_time", description: "When they called, in the business's timezone" },
  { name: "business_name", description: "The business's name" },
];

export function isTriggerType(value: string): value is TriggerType {
  return value in TRIGGERS;
}

// Plain-text output: escaping happens later, when the text is placed into the HTML email.
export function renderTemplate(template: string, vars: Record<string, string>): string {
  return Mustache.render(template, vars, {}, { escape: (value) => String(value) });
}

type Span = [string, string, number, number, Span[]?];

function variableNames(spans: Span[]): string[] {
  return spans.flatMap(([type, value, , , children]) => [
    ...(["name", "&", "{", "#", "^", ">"].includes(type) ? [value] : []),
    ...(children ? variableNames(children) : []),
  ]);
}

// Catches typos before they reach a real customer's email: returns a message to show, or null.
export function findTemplateProblem(template: string): string | null {
  let spans: Span[];
  try {
    spans = Mustache.parse(template) as unknown as Span[];
  } catch {
    return "One of the {{variables}} isn't closed properly — each needs two opening and two closing braces.";
  }

  const allowed = TEMPLATE_VARIABLES.map((variable) => variable.name);
  const unknown = variableNames(spans).find((name) => !allowed.includes(name));
  return unknown ? `{{${unknown}}} isn't a variable. Use ${allowed.map((name) => `{{${name}}}`).join(", ")}.` : null;
}

export function findTemplate(tenantId: string, triggerType: TriggerType, { activeOnly = true } = {}) {
  return prisma.template.findFirst({
    where: { tenantId, channel: "email", triggerType, ...(activeOnly ? { isActive: true } : {}) },
    orderBy: { id: "asc" },
  });
}
