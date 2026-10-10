import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { requireAdmin } from "@/lib/auth/dal";
import { daysAgo } from "@/lib/dates";
import { formatPhone } from "@/lib/format";
import { TENANT_STATUSES } from "@/lib/labels";
import { ActionForm } from "@/components/ActionForm";
import { Card, EmptyState, Field, PageHeader, StatusBadge, TimeZoneInput } from "@/components/ui";
import { inputClass, linkClass, tableClass, tdClass, thClass } from "@/components/styles";
import { createTenantAction } from "./actions";

export const metadata: Metadata = { title: "Businesses" };

export default async function TenantsPage() {
  await requireAdmin();

  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      phoneNumbers: { where: { isActive: true }, select: { phoneNumber: true } },
      _count: { select: { interactions: { where: { status: "missed", startedAt: { gte: daysAgo(30) } } } } },
    },
  });

  return (
    <>
      <PageHeader title="Businesses" description="Every business using the service, and the number each one forwards calls through." />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card flush>
          {tenants.length === 0 ? (
            <EmptyState title="No businesses yet" description="Add your first business with the form on the right." />
          ) : (
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>Business</th>
                  <th className={thClass}>Phone number</th>
                  <th className={`${thClass} text-right`}>Missed (30 days)</th>
                  <th className={thClass}>Status</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant) => {
                  const [firstNumber, ...otherNumbers] = tenant.phoneNumbers;
                  return (
                    <tr key={tenant.id} className="hover:bg-surface-muted/60">
                      <td className={tdClass}>
                        <Link href={`/admin/tenants/${tenant.id}`} className="font-medium text-ink hover:underline">
                          {tenant.name}
                        </Link>
                        <p className="mt-0.5 text-xs text-ink-muted">{tenant.ownerNotificationEmail}</p>
                      </td>
                      <td className={`${tdClass} whitespace-nowrap`}>
                        {firstNumber ? (
                          <>
                            {formatPhone(firstNumber.phoneNumber)}
                            {otherNumbers.length > 0 && <span className="text-ink-muted"> +{otherNumbers.length} more</span>}
                          </>
                        ) : (
                          <span className="text-ink-muted">No number yet</span>
                        )}
                      </td>
                      <td className={`${tdClass} text-right tabular-nums`}>{tenant._count.interactions}</td>
                      <td className={tdClass}>
                        <StatusBadge map={TENANT_STATUSES} value={tenant.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>

        <Card title="Add a business" description="You can add phone numbers and hours on the next screen.">
          <ActionForm action={createTenantAction} submitLabel="Add business" pendingLabel="Adding…" className="space-y-4">
            <Field label="Business name" htmlFor="new-name">
              <input id="new-name" name="name" required placeholder="Smith Plumbing" className={inputClass} />
            </Field>
            <Field label="Owner's email" htmlFor="new-email" hint="Missed-call alerts and login links go here.">
              <input
                id="new-email"
                name="ownerNotificationEmail"
                type="email"
                required
                placeholder="owner@smithplumbing.com"
                className={inputClass}
              />
            </Field>
            <Field label="Timezone" htmlFor="new-timezone" hint="Start typing a city, e.g. New_York or Karachi.">
              <TimeZoneInput id="new-timezone" name="timezone" defaultValue="America/New_York" />
            </Field>
          </ActionForm>
        </Card>
      </div>

      <p className="mt-6 text-sm text-ink-muted">
        Looking for call activity?{" "}
        <Link href="/admin/interactions" className={linkClass}>
          See all calls
        </Link>
      </p>
    </>
  );
}
