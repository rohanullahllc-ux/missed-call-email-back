import { prisma } from "@/lib/db/client";

export async function resolveTenantByPhoneNumber(phoneNumber: string) {
  const record = await prisma.phoneNumber.findUnique({
    where: { phoneNumber },
    include: { tenant: { include: { businessHours: true } } },
  });

  if (!record || !record.isActive) {
    return null;
  }

  return { phoneNumber: record, tenant: record.tenant };
}
