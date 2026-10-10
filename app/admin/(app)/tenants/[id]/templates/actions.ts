"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { requireAdmin } from "@/lib/auth/dal";
import { appBaseUrl } from "@/lib/config";
import { buildMissedCallEmail } from "@/lib/email/messages";
import { sendEmail } from "@/lib/email/sendEmail";
import { failed, field, succeeded, type ActionResult } from "@/lib/forms";
import { TRIGGERS, findTemplate, findTemplateProblem, isTriggerType } from "@/lib/templates/templates";
import { SAMPLE_CALLER_PHONE } from "./sample";

export async function saveTemplateAction(
  tenantId: string,
  triggerType: string,
  _previous: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin();
  if (!isTriggerType(triggerType)) {
    return failed("Unknown template type.");
  }

  const subject = field(formData, "subject");
  const body = field(formData, "body");
  const isActive = formData.get("isActive") === "on";

  if (!subject || !body) {
    return failed("The subject and message are both required.");
  }
  const problem = findTemplateProblem(subject) ?? findTemplateProblem(body);
  if (problem) {
    return failed(problem);
  }

  const existing = await findTemplate(tenantId, triggerType, { activeOnly: false });
  if (existing) {
    await prisma.template.update({ where: { id: existing.id }, data: { subject, body, isActive } });
  } else {
    await prisma.template.create({ data: { tenantId, channel: "email", triggerType, subject, body, isActive } });
  }

  revalidatePath(`/admin/tenants/${tenantId}/templates`);
  return succeeded("Template saved");
}

export async function sendTestEmailAction(tenantId: string, triggerType: string): Promise<ActionResult> {
  await requireAdmin();
  if (!isTriggerType(triggerType)) {
    return failed("Unknown template type.");
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    return failed("Business not found.");
  }

  const saved = await findTemplate(tenantId, triggerType, { activeOnly: false });
  const email = buildMissedCallEmail({
    template: {
      subject: saved?.subject || TRIGGERS[triggerType].defaults.subject,
      body: saved?.body || TRIGGERS[triggerType].defaults.body,
    },
    businessName: tenant.name,
    callerPhone: SAMPLE_CALLER_PHONE,
    calledAt: new Date(),
    timeZone: tenant.timezone,
    leadUrl: `${appBaseUrl()}/dashboard`,
  });

  const result = await sendEmail({ ...email, to: tenant.ownerNotificationEmail, subject: `[Test] ${email.subject}` });
  return result.ok ? succeeded(`Sent to ${tenant.ownerNotificationEmail}`) : failed(`Couldn't send: ${result.error}`);
}
