import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireAdmin } from "@/lib/auth/dal";
import { appBaseUrl } from "@/lib/config";
import { daysAgo } from "@/lib/dates";
import { formatDateTime, formatPhone, formatRelative } from "@/lib/format";
import { CALL_OUTCOMES, DAY_NAMES, TENANT_STATUSES } from "@/lib/labels";
import { ActionForm } from "@/components/ActionForm";
import { Badge, Card, EmptyState, Field, PageHeader, StatCard, StatusBadge, TimeZoneInput } from "@/components/ui";
import { buttonClass, compactInputClass, inputClass, linkClass } from "@/components/styles";
import {
  addPhoneNumberAction,
  clearBusinessHoursAction,
  setPhoneNumberActiveAction,
  updateBusinessHoursAction,
  updateTenantAction,
} from "./actions";

export const metadata: Metadata = { title: "Business" };

export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: {
      phoneNumbers: { orderBy: { phoneNumber: "asc" } },
      businessHours: true,
      interactions: { orderBy: { startedAt: "desc" }, take: 6 },
    },
  });
  if (!tenant) {
    notFound();
  }

  const [missedCount, waitingCount, wonCount] = await Promise.all([
    prisma.interaction.count({ where: { tenantId: id, status: "missed", startedAt: { gte: daysAgo(30) } } }),
    prisma.caller.count({ where: { tenantId: id, status: { in: ["new", "notified"] } } }),
    prisma.caller.count({ where: { tenantId: id, status: "converted" } }),
  ]);

  const voiceWebhookUrl = `${appBaseUrl()}/api/webhooks/twilio/voice`;
  const webhookIsLocal = /\/\/(localhost|127\.0\.0\.1)/.test(voiceWebhookUrl);
  const hoursByDay = new Map(tenant.businessHours.map((hours) => [hours.dayOfWeek, hours]));

  return (
    <>
      <PageHeader
        back={{ href: "/admin/tenants", label: "Businesses" }}
        title={tenant.name}
        badge={<StatusBadge map={TENANT_STATUSES} value={tenant.status} />}
        description={`Missed-call alerts go to ${tenant.ownerNotificationEmail}`}
        actions={
          <>
            <Link href={`/admin/tenants/${tenant.id}/templates`} className={buttonClass("secondary", "sm")}>
              Email templates
            </Link>
            <Link href={`/admin/interactions?tenantId=${tenant.id}`} className={buttonClass("secondary", "sm")}>
              Call log
            </Link>
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Missed calls" value={missedCount} hint="Last 30 days" />
        <StatCard label="Waiting for a callback" value={waitingCount} hint="Callers not yet marked won or closed" />
        <StatCard label="Won" value={wonCount} hint="Callers the owner marked as won" />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card title="Business details">
            <ActionForm action={updateTenantAction.bind(null, tenant.id)} submitLabel="Save changes" className="space-y-4">
              <Field label="Business name" htmlFor="name">
                <input id="name" name="name" defaultValue={tenant.name} required className={inputClass} />
              </Field>
              <Field label="Owner's email" htmlFor="ownerNotificationEmail" hint="Missed-call alerts and login links go here.">
                <input
                  id="ownerNotificationEmail"
                  name="ownerNotificationEmail"
                  type="email"
                  defaultValue={tenant.ownerNotificationEmail}
                  required
                  className={inputClass}
                />
              </Field>
              <Field label="Timezone" htmlFor="timezone" hint="Used for business hours and the times shown in emails.">
                <TimeZoneInput id="timezone" name="timezone" defaultValue={tenant.timezone} />
              </Field>
              <Field
                label="Status"
                htmlFor="status"
                hint={
                  <ul className="space-y-0.5">
                    {Object.entries(TENANT_STATUSES).map(([key, status]) => (
                      <li key={key}>
                        <span className="font-medium text-ink">{status.label}:</span> {status.description}
                      </li>
                    ))}
                  </ul>
                }
              >
                <select id="status" name="status" defaultValue={tenant.status} className={inputClass}>
                  {Object.entries(TENANT_STATUSES).map(([key, status]) => (
                    <option key={key} value={key}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </Field>
            </ActionForm>
          </Card>

          <Card
            title="Business hours"
            description={
              <>
                Calls missed outside these hours use the{" "}
                <Link href={`/admin/tenants/${tenant.id}/templates`} className={linkClass}>
                  after-hours email
                </Link>
                , if one is set up.
              </>
            }
          >
            {tenant.businessHours.length === 0 && (
              <p className="mb-4 rounded-lg bg-info-soft px-3 py-2.5 text-sm text-info">
                No hours saved yet, so every missed call counts as during business hours. Adjust the suggestion below and save.
              </p>
            )}
            <ActionForm action={updateBusinessHoursAction.bind(null, tenant.id)} submitLabel="Save hours" className="space-y-4">
              <div className="divide-y divide-line">
                {DAY_NAMES.map((day, dayOfWeek) => {
                  const hours = hoursByDay.get(dayOfWeek);
                  const weekend = dayOfWeek === 0 || dayOfWeek === 6;
                  return (
                    <div key={day} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5">
                      <span className="w-24 text-sm font-medium text-ink">{day}</span>
                      <input
                        type="time"
                        name={`open_${dayOfWeek}`}
                        defaultValue={hours?.openTime ?? "09:00"}
                        aria-label={`${day} opening time`}
                        className={`${compactInputClass} w-32`}
                      />
                      <span className="text-sm text-ink-muted">to</span>
                      <input
                        type="time"
                        name={`close_${dayOfWeek}`}
                        defaultValue={hours?.closeTime ?? "17:00"}
                        aria-label={`${day} closing time`}
                        className={`${compactInputClass} w-32`}
                      />
                      <label className="ml-auto flex items-center gap-2 text-sm text-ink-muted">
                        <input
                          type="checkbox"
                          name={`closed_${dayOfWeek}`}
                          defaultChecked={hours ? hours.isClosed : weekend}
                          className="size-4 accent-brand"
                        />
                        Closed
                      </label>
                    </div>
                  );
                })}
              </div>
            </ActionForm>
            {tenant.businessHours.length > 0 && (
              <ActionForm
                action={clearBusinessHoursAction.bind(null, tenant.id)}
                submitLabel="Clear hours (treat as always open)"
                pendingLabel="Clearing…"
                variant="ghost"
                size="sm"
                className="mt-3 border-t border-line pt-3"
              />
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card
            title="Phone numbers"
            description="Calls to these Twilio numbers ring the owner's cell. If nobody answers within 20 seconds, the owner gets an email."
          >
            {tenant.phoneNumbers.length === 0 ? (
              <p className="text-sm text-ink-muted">No numbers connected yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {tenant.phoneNumbers.map((number) => (
                  <li key={number.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0">
                    <div className="min-w-40 flex-1">
                      <p className="font-medium text-ink">{formatPhone(number.phoneNumber)}</p>
                      <p className="text-xs text-ink-muted">Rings {formatPhone(number.forwardingNumber)}</p>
                    </div>
                    <Badge tone={number.isActive ? "success" : "neutral"}>{number.isActive ? "Active" : "Inactive"}</Badge>
                    <ActionForm
                      action={setPhoneNumberActiveAction.bind(null, tenant.id, number.id, !number.isActive)}
                      submitLabel={number.isActive ? "Deactivate" : "Activate"}
                      pendingLabel="…"
                      variant="secondary"
                      size="sm"
                      quiet
                    />
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-ink-muted">
              Inactive numbers stop forwarding calls entirely. To keep calls ringing but stop emails, set the business to Paused instead.
            </p>

            <details className="mt-4 rounded-lg border border-line">
              <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-accent">Connect a Twilio number</summary>
              <div className="border-t border-line px-4 py-4">
                <ActionForm
                  action={addPhoneNumberAction.bind(null, tenant.id)}
                  submitLabel="Connect number"
                  pendingLabel="Connecting…"
                  className="space-y-4"
                >
                  <Field label="Twilio number" htmlFor="phoneNumber" hint="With country code, e.g. +15551234567.">
                    <input id="phoneNumber" name="phoneNumber" required placeholder="+15551234567" className={inputClass} />
                  </Field>
                  <Field label="Number SID" htmlFor="twilioSid" hint="Starts with PN — shown on the number's page in Twilio.">
                    <input
                      id="twilioSid"
                      name="twilioSid"
                      required
                      placeholder="PN…"
                      spellCheck={false}
                      className={`${inputClass} font-mono`}
                    />
                  </Field>
                  <Field label="Owner's cell to ring" htmlFor="forwardingNumber" hint="With country code, e.g. +923001234567.">
                    <input id="forwardingNumber" name="forwardingNumber" required placeholder="+923001234567" className={inputClass} />
                  </Field>
                </ActionForm>
              </div>
            </details>

            <div className="mt-5 rounded-lg border border-line bg-surface-muted p-4 text-sm">
              <p className="font-medium text-ink">Twilio setup</p>
              <p className="mt-1 text-ink-muted">
                In the Twilio Console, open each number above → Voice configuration → set &ldquo;A call comes in&rdquo; to
                Webhook, HTTP POST, with this URL:
              </p>
              <code className="mt-2 block break-all rounded-md border border-line bg-surface px-3 py-2 font-mono text-xs text-ink">
                {voiceWebhookUrl}
              </code>
              {webhookIsLocal && (
                <p className="mt-2 text-warning">
                  This is a localhost address, which Twilio can&apos;t reach. For local testing, run ngrok, set APP_BASE_URL in
                  .env.local to its https address, and restart the app.
                </p>
              )}
            </div>
          </Card>

          <Card
            title="Recent calls"
            flush
            actions={
              <Link href={`/admin/interactions?tenantId=${tenant.id}`} className={`${linkClass} text-sm`}>
                View all
              </Link>
            }
          >
            {tenant.interactions.length === 0 ? (
              <EmptyState title="No calls yet" description="Calls appear here once the Twilio number is connected and someone dials it." />
            ) : (
              <ul className="divide-y divide-line">
                {tenant.interactions.map((call) => (
                  <li key={call.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">
                        {call.fromNumber ? formatPhone(call.fromNumber) : "Unknown caller"}
                      </p>
                      <p className="text-xs text-ink-muted">
                        {formatDateTime(call.startedAt, tenant.timezone)} · {formatRelative(call.startedAt)}
                      </p>
                    </div>
                    <StatusBadge map={CALL_OUTCOMES} value={call.status} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
