import { prisma } from "../lib/db/client";
import { TRIGGERS } from "../lib/templates/templates";

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: "test-business" },
    update: {},
    create: {
      name: "Test Business",
      slug: "test-business",
      timezone: "America/New_York",
      ownerNotificationEmail: (process.env.SEED_OWNER_EMAIL ?? "owner@example.com").toLowerCase(),
    },
  });

  const phoneNumber = process.env.SEED_TWILIO_NUMBER ?? "+15550000000";
  await prisma.phoneNumber.upsert({
    where: { phoneNumber },
    update: {},
    create: {
      tenantId: tenant.id,
      twilioSid: process.env.SEED_TWILIO_SID ?? "PN00000000000000000000000000000000",
      phoneNumber,
      forwardingNumber: process.env.SEED_FORWARDING_NUMBER ?? "+15551111111",
    },
  });

  await prisma.template.upsert({
    where: { id: "seed-missed-call-email" },
    update: {},
    create: {
      id: "seed-missed-call-email",
      tenantId: tenant.id,
      channel: "email",
      triggerType: "missed_call",
      ...TRIGGERS.missed_call.defaults,
    },
  });

  console.log(`Seeded tenant "${tenant.name}" (${tenant.id})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
