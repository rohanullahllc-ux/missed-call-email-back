import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { requireTenant } from "@/lib/auth/dal";
import { daysAgo } from "@/lib/dates";
import { formatDateTime, formatPhone, formatRelative, telHref } from "@/lib/format";
import { LEAD_STATUSES } from "@/lib/labels";
import { ActionForm } from "@/components/ActionForm";
import { Card, EmptyState, PageHeader, PhoneIcon, PhoneMissedIcon, StatCard, StatusBadge } from "@/components/ui";
import { buttonClass } from "@/components/styles";
import { setLeadStatusAction } from "./actions";

export const metadata: Metadata = { title: "Dashboard" };

const OPEN_STATUSES = ["new", "notified"];

export default async function DashboardPage() {
  const tenant = await requireTenant();
  const missed = { tenantId: tenant.id, status: "missed" };
  const open = { tenantId: tenant.id, status: { in: OPEN_STATUSES } };

  const [missedThisWeek, missedThisMonth, waitingCount, wonCount, waiting, recent] = await Promise.all([
    prisma.interaction.count({ where: { ...missed, startedAt: { gte: daysAgo(7) } } }),
    prisma.interaction.count({ where: { ...missed, startedAt: { gte: daysAgo(30) } } }),
    prisma.caller.count({ where: open }),
    prisma.caller.count({ where: { tenantId: tenant.id, status: "converted" } }),
    prisma.caller.findMany({
      where: open,
      orderBy: { lastContactAt: "desc" },
      take: 10,
      include: { _count: { select: { interactions: { where: { status: "missed" } } } } },
    }),
    prisma.interaction.findMany({ where: missed, include: { caller: true }, orderBy: { startedAt: "desc" }, take: 20 }),
  ]);

  return (
    <>
      <PageHeader title="Missed calls" description={`Everyone who called ${tenant.name} when you couldn't pick up.`} />

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Missed this week" value={missedThisWeek} />
        <StatCard label="Missed this month" value={missedThisMonth} />
        <StatCard label="Waiting for a callback" value={waitingCount} />
        <StatCard label="Won" value={wonCount} hint="Callers you marked as won" />
      </div>

      <Card
        title="Call these people back"
        description="Most recent first. Mark each one once you've dealt with it."
        flush
        className="mb-6"
      >
        {waiting.length === 0 ? (
          <EmptyState
            title="You're all caught up"
            description="When you miss a call, the caller shows up here with a button to call them straight back."
          />
        ) : (
          <ul className="divide-y divide-line">
            {waiting.map((caller) => (
              <li key={caller.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4">
                <div className="flex min-w-56 flex-1 items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger">
                    <PhoneMissedIcon className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <Link href={`/dashboard/leads/${caller.id}`} className="font-medium text-ink hover:underline">
                      {formatPhone(caller.phoneNumber)}
                    </Link>
                    <p className="text-xs text-ink-muted">
                      {caller._count.interactions === 1 ? "1 missed call" : `${caller._count.interactions} missed calls`} ·{" "}
                      {formatRelative(caller.lastContactAt)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <a href={telHref(caller.phoneNumber)} className={buttonClass("primary", "sm")}>
                    <PhoneIcon className="size-3.5" />
                    Call back
                  </a>
                  <ActionForm
                    action={setLeadStatusAction.bind(null, caller.id, "converted")}
                    submitLabel="Mark won"
                    pendingLabel="…"
                    variant="secondary"
                    size="sm"
                    quiet
                  />
                  <ActionForm
                    action={setLeadStatusAction.bind(null, caller.id, "closed")}
                    submitLabel="Dismiss"
                    pendingLabel="…"
                    variant="ghost"
                    size="sm"
                    quiet
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Recent missed calls" flush>
        {recent.length === 0 ? (
          <EmptyState title="No missed calls yet" description="Every missed call will be listed here." />
        ) : (
          <ul className="divide-y divide-line">
            {recent.map((call) => (
              <li key={call.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  {call.caller ? (
                    <Link href={`/dashboard/leads/${call.caller.id}`} className="font-medium text-ink hover:underline">
                      {formatPhone(call.caller.phoneNumber)}
                    </Link>
                  ) : (
                    <p className="font-medium text-ink">{call.fromNumber ? formatPhone(call.fromNumber) : "Unknown caller"}</p>
                  )}
                  <p className="text-xs text-ink-muted">
                    {formatDateTime(call.startedAt, tenant.timezone)} · {formatRelative(call.startedAt)}
                  </p>
                </div>
                {call.caller && <StatusBadge map={LEAD_STATUSES} value={call.caller.status} />}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
