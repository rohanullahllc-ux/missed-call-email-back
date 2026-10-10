import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { requireAdmin } from "@/lib/auth/dal";
import { formatDateTime, formatPhone, formatRelative } from "@/lib/format";
import { CALL_OUTCOMES, EMAIL_STATUSES, LEAD_STATUSES } from "@/lib/labels";
import { ActionForm } from "@/components/ActionForm";
import { Card, EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { buttonClass, compactInputClass, inputClass, linkClass, tableClass, tdClass, thClass } from "@/components/styles";
import { setLeadStatusAction } from "./actions";

export const metadata: Metadata = { title: "Calls" };

export default async function CallsPage({
  searchParams,
}: {
  searchParams: Promise<{ tenantId?: string; outcome?: string }>;
}) {
  await requireAdmin();
  const { tenantId, outcome } = await searchParams;
  const outcomeFilter = outcome && outcome in CALL_OUTCOMES ? outcome : undefined;

  const [tenants, calls] = await Promise.all([
    prisma.tenant.findMany({ select: { id: true, name: true, slug: true }, orderBy: { name: "asc" } }),
    prisma.interaction.findMany({
      where: { ...(tenantId ? { tenantId } : {}), ...(outcomeFilter ? { status: outcomeFilter } : {}) },
      include: {
        tenant: { select: { id: true, name: true, timezone: true } },
        caller: true,
        messages: { select: { status: true }, orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { startedAt: "desc" },
      take: 100,
    }),
  ]);

  const nameCounts = new Map<string, number>();
  tenants.forEach((tenant) => nameCounts.set(tenant.name, (nameCounts.get(tenant.name) ?? 0) + 1));
  const tenantLabel = (tenant: { name: string; slug: string }) =>
    (nameCounts.get(tenant.name) ?? 0) > 1 ? `${tenant.name} (${tenant.slug})` : tenant.name;
  const selectedTenant = tenants.find((tenant) => tenant.id === tenantId);

  return (
    <>
      <PageHeader
        title="Calls"
        description={
          selectedTenant
            ? `Calls to ${tenantLabel(selectedTenant)}, newest first.`
            : "Every call to every business's number, newest first."
        }
      />

      <Form action="/admin/interactions" className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-64">
          <label htmlFor="tenantId" className="text-xs font-medium text-ink-muted">
            Business
          </label>
          <select id="tenantId" name="tenantId" defaultValue={tenantId ?? ""} className={`${inputClass} mt-1`}>
            <option value="">All businesses</option>
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenantLabel(tenant)}
              </option>
            ))}
          </select>
        </div>
        <div className="w-44">
          <label htmlFor="outcome" className="text-xs font-medium text-ink-muted">
            Outcome
          </label>
          <select id="outcome" name="outcome" defaultValue={outcomeFilter ?? ""} className={`${inputClass} mt-1`}>
            <option value="">All outcomes</option>
            {Object.entries(CALL_OUTCOMES).map(([key, { label }]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className={buttonClass("secondary")}>
          Apply
        </button>
        {(tenantId || outcomeFilter) && (
          <Link href="/admin/interactions" className={`${linkClass} pb-2.5 text-sm`}>
            Clear filters
          </Link>
        )}
      </Form>

      <Card flush>
        {calls.length === 0 ? (
          <EmptyState
            title="No calls yet"
            description="Calls show up here as soon as someone dials a connected Twilio number."
          />
        ) : (
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>When</th>
                <th className={thClass}>Business</th>
                <th className={thClass}>Caller</th>
                <th className={thClass}>Outcome</th>
                <th className={thClass}>Alert</th>
                <th className={thClass}>Lead status</th>
              </tr>
            </thead>
            <tbody>
              {calls.map((call) => (
                <tr key={call.id}>
                  <td className={`${tdClass} whitespace-nowrap`}>
                    <p className="text-ink">{formatDateTime(call.startedAt, call.tenant.timezone)}</p>
                    <p className="text-xs text-ink-muted">{formatRelative(call.startedAt)}</p>
                  </td>
                  <td className={tdClass}>
                    <Link href={`/admin/tenants/${call.tenant.id}`} className="text-ink hover:underline">
                      {call.tenant.name}
                    </Link>
                  </td>
                  <td className={`${tdClass} whitespace-nowrap`}>
                    {call.fromNumber ? formatPhone(call.fromNumber) : <span className="text-ink-muted">Unknown</span>}
                  </td>
                  <td className={tdClass}>
                    <StatusBadge map={CALL_OUTCOMES} value={call.status} />
                  </td>
                  <td className={tdClass}>
                    {call.messages[0] ? (
                      <StatusBadge map={EMAIL_STATUSES} value={call.messages[0].status} />
                    ) : (
                      <span className="text-ink-muted">—</span>
                    )}
                  </td>
                  <td className={tdClass}>
                    {call.caller ? (
                      <ActionForm
                        action={setLeadStatusAction.bind(null, call.caller.id)}
                        submitLabel="Save"
                        pendingLabel="…"
                        variant="secondary"
                        size="sm"
                        quiet
                        className="flex items-center gap-2"
                      >
                        <select
                          name="status"
                          defaultValue={call.caller.status}
                          aria-label="Lead status"
                          className={`${compactInputClass} w-40`}
                        >
                          {Object.entries(LEAD_STATUSES).map(([key, { label }]) => (
                            <option key={key} value={key}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </ActionForm>
                    ) : (
                      <span className="text-ink-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
