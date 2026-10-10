"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireTenant } from "@/lib/auth/dal";
import { TENANT_COOKIE } from "@/lib/auth/session";
import { failed, succeeded, type ActionResult } from "@/lib/forms";
import { LEAD_STATUSES } from "@/lib/labels";

export async function setLeadStatusAction(callerId: string, status: string): Promise<ActionResult> {
  const tenant = await requireTenant();
  if (!(status in LEAD_STATUSES)) {
    return failed("Unknown status.");
  }

  // Scoped to the logged-in business, so another business's caller id matches nothing.
  const { count } = await prisma.caller.updateMany({ where: { id: callerId, tenantId: tenant.id }, data: { status } });
  if (count === 0) {
    return failed("That caller wasn't found.");
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/leads/${callerId}`);
  return succeeded("Updated");
}

export async function logoutAction() {
  (await cookies()).delete(TENANT_COOKIE);
  redirect("/login");
}
