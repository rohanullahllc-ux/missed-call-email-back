"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { requireAdmin } from "@/lib/auth/dal";
import { isValidTimeZone } from "@/lib/format";
import { DAY_NAMES, TENANT_STATUSES } from "@/lib/labels";
import { EMAIL_PATTERN, PHONE_PATTERN, failed, field, succeeded, type ActionResult } from "@/lib/forms";

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function refresh(tenantId: string) {
  revalidatePath(`/admin/tenants/${tenantId}`);
  revalidatePath("/admin/tenants");
}

function digitsAndPlus(value: string): string {
  return value.replace(/[\s().-]/g, "");
}

export async function updateTenantAction(tenantId: string, _previous: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const name = field(formData, "name");
  const ownerNotificationEmail = field(formData, "ownerNotificationEmail").toLowerCase();
  const timezone = field(formData, "timezone");
  const status = field(formData, "status");

  if (!name) {
    return failed("Enter the business name.");
  }
  if (!EMAIL_PATTERN.test(ownerNotificationEmail)) {
    return failed("Enter a valid owner email.");
  }
  if (!isValidTimeZone(timezone)) {
    return failed(`"${timezone}" isn't a recognized timezone — pick one from the list.`);
  }
  if (!(status in TENANT_STATUSES)) {
    return failed("Pick a valid status.");
  }

  await prisma.tenant.update({ where: { id: tenantId }, data: { name, ownerNotificationEmail, timezone, status } });
  refresh(tenantId);
  return succeeded("Changes saved");
}

export async function addPhoneNumberAction(tenantId: string, _previous: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const phoneNumber = digitsAndPlus(field(formData, "phoneNumber"));
  const forwardingNumber = digitsAndPlus(field(formData, "forwardingNumber"));
  const twilioSid = field(formData, "twilioSid");

  if (!PHONE_PATTERN.test(phoneNumber)) {
    return failed("Enter the Twilio number with its country code, e.g. +15551234567.");
  }
  if (!PHONE_PATTERN.test(forwardingNumber)) {
    return failed("Enter the owner's cell with its country code, e.g. +923001234567.");
  }
  if (!/^PN[0-9a-f]{32}$/i.test(twilioSid)) {
    return failed("The number's SID starts with PN followed by 32 letters and digits — copy it from the number's page in Twilio.");
  }

  try {
    await prisma.phoneNumber.create({ data: { tenantId, phoneNumber, forwardingNumber, twilioSid } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return failed("That Twilio number is already connected to a business.");
    }
    throw error;
  }

  refresh(tenantId);
  return succeeded("Number connected");
}

export async function setPhoneNumberActiveAction(tenantId: string, phoneNumberId: string, isActive: boolean): Promise<ActionResult> {
  await requireAdmin();
  await prisma.phoneNumber.update({ where: { id: phoneNumberId, tenantId }, data: { isActive } });
  refresh(tenantId);
  return succeeded(isActive ? "Activated" : "Deactivated");
}

export async function updateBusinessHoursAction(tenantId: string, _previous: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const days = DAY_NAMES.map((_, dayOfWeek) => ({
    dayOfWeek,
    isClosed: formData.get(`closed_${dayOfWeek}`) === "on",
    openTime: field(formData, `open_${dayOfWeek}`),
    closeTime: field(formData, `close_${dayOfWeek}`),
  }));

  const incomplete = days.find((day) => !day.isClosed && !(TIME_PATTERN.test(day.openTime) && TIME_PATTERN.test(day.closeTime)));
  if (incomplete) {
    return failed(`Set opening and closing times for ${DAY_NAMES[incomplete.dayOfWeek]}, or mark it closed.`);
  }

  await prisma.$transaction(
    days.map(({ dayOfWeek, isClosed, openTime, closeTime }) => {
      const data = { isClosed, openTime: openTime || null, closeTime: closeTime || null };
      return prisma.businessHour.upsert({
        where: { tenantId_dayOfWeek: { tenantId, dayOfWeek } },
        update: data,
        create: { tenantId, dayOfWeek, ...data },
      });
    })
  );

  refresh(tenantId);
  return succeeded("Hours saved");
}

export async function clearBusinessHoursAction(tenantId: string): Promise<ActionResult> {
  await requireAdmin();
  await prisma.businessHour.deleteMany({ where: { tenantId } });
  refresh(tenantId);
  return succeeded("Hours cleared");
}
