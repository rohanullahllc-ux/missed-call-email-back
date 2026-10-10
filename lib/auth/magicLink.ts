import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/db/client";
import { appBaseUrl } from "@/lib/config";
import { buildLoginEmail } from "@/lib/email/messages";
import { sendEmail } from "@/lib/email/sendEmail";

export const LOGIN_LINK_TTL_MINUTES = 15;

// Only a hash is stored, so a leaked database copy can't be used to log in.
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function requestMagicLinks(email: string): Promise<void> {
  const tenants = await prisma.tenant.findMany({
    where: { ownerNotificationEmail: { equals: email, mode: "insensitive" } },
    orderBy: { name: "asc" },
  });
  if (tenants.length === 0) {
    return;
  }

  const expiresAt = new Date(Date.now() + LOGIN_LINK_TTL_MINUTES * 60 * 1000);
  const links: { businessName: string; url: string }[] = [];

  for (const tenant of tenants) {
    const token = randomBytes(32).toString("hex");
    await prisma.loginToken.create({ data: { tenantId: tenant.id, token: hashToken(token), expiresAt } });
    links.push({ businessName: tenant.name, url: `${appBaseUrl()}/api/auth/magic-link/verify?token=${token}` });
  }

  const result = await sendEmail({
    to: tenants[0].ownerNotificationEmail,
    ...buildLoginEmail({ links, expiresInMinutes: LOGIN_LINK_TTL_MINUTES }),
  });
  if (!result.ok) {
    console.error(`Failed to send login email to ${email}:`, result.error);
  }
}

export async function consumeMagicLink(token: string): Promise<{ tenantId: string } | null> {
  const tokenHash = hashToken(token);
  const now = new Date();

  // A single conditional update, so two simultaneous clicks can't both succeed.
  const { count } = await prisma.loginToken.updateMany({
    where: { token: tokenHash, usedAt: null, expiresAt: { gt: now } },
    data: { usedAt: now },
  });
  if (count === 0) {
    return null;
  }

  const record = await prisma.loginToken.findUnique({ where: { token: tokenHash } });
  return record && { tenantId: record.tenantId };
}
