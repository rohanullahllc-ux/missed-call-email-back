"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireAdmin } from "@/lib/auth/dal";
import { isValidTimeZone } from "@/lib/format";
import { EMAIL_PATTERN, failed, field, type ActionResult } from "@/lib/forms";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function createTenantAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const name = field(formData, "name");
  const ownerNotificationEmail = field(formData, "ownerNotificationEmail").toLowerCase();
  const timezone = field(formData, "timezone");

  if (!name) {
    return failed("Enter the business name.");
  }
  if (!EMAIL_PATTERN.test(ownerNotificationEmail)) {
    return failed("Enter a valid owner email.");
  }
  if (!isValidTimeZone(timezone)) {
    return failed(`"${timezone}" isn't a recognized timezone — pick one from the list.`);
  }

  const baseSlug = slugify(name) || "business";
  let slug = baseSlug;
  for (let n = 2; await prisma.tenant.findUnique({ where: { slug } }); n++) {
    slug = `${baseSlug}-${n}`;
  }

  const tenant = await prisma.tenant.create({ data: { name, slug, ownerNotificationEmail, timezone } });

  revalidatePath("/admin/tenants");
  redirect(`/admin/tenants/${tenant.id}`);
}
