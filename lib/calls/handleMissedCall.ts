import type { BusinessHour, Tenant } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { appBaseUrl } from "@/lib/config";
import { isOpen } from "@/lib/business-hours/isOpen";
import { buildMissedCallEmail } from "@/lib/email/messages";
import { sendEmail } from "@/lib/email/sendEmail";
import { TRIGGERS, findTemplate } from "@/lib/templates/templates";

export async function handleMissedCall(params: {
  tenant: Tenant & { businessHours: BusinessHour[] };
  interactionId: string;
  callerPhone: string;
  calledAt: Date;
}): Promise<void> {
  const { tenant, interactionId, callerPhone, calledAt } = params;

  // A new missed call always reopens the lead, even if it was previously won or closed.
  const caller = await prisma.caller.upsert({
    where: { tenantId_phoneNumber: { tenantId: tenant.id, phoneNumber: callerPhone } },
    update: { lastContactAt: calledAt, status: "new" },
    create: { tenantId: tenant.id, phoneNumber: callerPhone, firstSeenAt: calledAt, lastContactAt: calledAt },
  });
  await prisma.interaction.update({ where: { id: interactionId }, data: { callerId: caller.id } });

  if (tenant.status === "paused") {
    return;
  }

  const afterHours = !isOpen(tenant.businessHours, tenant.timezone, calledAt);
  const template =
    (afterHours ? await findTemplate(tenant.id, "missed_call_after_hours") : null) ??
    (await findTemplate(tenant.id, "missed_call"));

  const email = buildMissedCallEmail({
    template: {
      subject: template?.subject || TRIGGERS.missed_call.defaults.subject,
      body: template?.body || TRIGGERS.missed_call.defaults.body,
    },
    businessName: tenant.name,
    callerPhone,
    calledAt,
    timeZone: tenant.timezone,
    leadUrl: `${appBaseUrl()}/dashboard/leads/${caller.id}`,
  });

  const result = await sendEmail({ to: tenant.ownerNotificationEmail, ...email });
  if (!result.ok) {
    console.error(`Failed to send missed-call email for ${tenant.name}:`, result.error);
  }

  await prisma.message.create({
    data: {
      tenantId: tenant.id,
      callerId: caller.id,
      interactionId,
      channel: "email",
      direction: "outbound",
      providerMessageId: result.ok ? result.providerMessageId : null,
      status: result.ok ? "sent" : "failed",
      subject: email.subject,
      body: email.text,
    },
  });

  if (result.ok) {
    await prisma.caller.update({ where: { id: caller.id }, data: { status: "notified" } });
  }
}
