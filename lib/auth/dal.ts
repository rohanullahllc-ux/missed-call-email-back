import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { ADMIN_COOKIE, TENANT_COOKIE, readSession } from "./session";

// The proxy's redirect is only a fast pre-check; these calls are the real access gate.

export const requireAdmin = cache(async (): Promise<void> => {
  const session = await readSession((await cookies()).get(ADMIN_COOKIE)?.value);
  if (session?.role !== "admin") {
    redirect("/admin/login");
  }
});

export const requireTenant = cache(async () => {
  const session = await readSession((await cookies()).get(TENANT_COOKIE)?.value);
  if (session?.role !== "tenant") {
    redirect("/login");
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: session.tenantId } });
  if (!tenant) {
    redirect("/login");
  }

  return tenant;
});
