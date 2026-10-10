"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { requireAdmin } from "@/lib/auth/dal";
import { failed, field, succeeded, type ActionResult } from "@/lib/forms";
import { LEAD_STATUSES } from "@/lib/labels";

export async function setLeadStatusAction(callerId: string, _previous: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const status = field(formData, "status");
  if (!(status in LEAD_STATUSES)) {
    return failed("Pick a valid status.");
  }

  await prisma.caller.update({ where: { id: callerId }, data: { status } });
  revalidatePath("/admin/interactions");
  return succeeded("Saved");
}
