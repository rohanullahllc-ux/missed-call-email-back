import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireTenant } from "@/lib/auth/dal";
import { formatDateTime, formatPhone, formatRelative, telHref } from "@/lib/format";
import { LEAD_STATUSES } from "@/lib/labels";
import { ActionForm } from "@/components/ActionForm";
import { Card, EmptyState, MailIcon, PageHeader, PhoneIcon, PhoneMissedIcon, StatusBadge } from "@/components/ui";
import { buttonClass } from "@/components/styles";
import { setLeadStatusAction } from "../../actions";

export const metadata: Metadata = { title: "Caller" };

const STATUS_ACTIONS = [
  { status: "notified", label: "Mark as needs callback" },
  { status: "converted", label: "Mark as won" },
  { status: "closed", label: "Mark as closed" },
];

type TimelineEvent = { id: string; at: Date; icon: "missed" | "call" | "email"; title: string; detail?: string | null };

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const tenant = await requireTenant();
  const { id } = await params;

  // Scoped by tenant, so another business's caller id simply isn't found.
  const caller = await prisma.caller.findFirst({
    where: { id, tenantId: tenant.id },
    include: { messages: { orderBy: { createdAt: "desc" } } },
  });
  if (!caller) {
    notFound();
  }

  const calls = await prisma.interaction.findMany({
    where: { tenantId: tenant.id, OR: [{ callerId: caller.id }, { fromNumber: caller.phoneNumber }] },
    orderBy: { startedAt: "desc" },
  });

  const timeline: TimelineEvent[] = [
    ...calls.map((call) => ({
      id: call.id,
      at: call.startedAt,
      icon: call.status === "missed" ? ("missed" as const) : ("call" as const),
      title: call.status === "missed" ? "Missed call" : call.status === "answered" ? "Answered call" : "Incoming call",
    })),
    ...caller.messages.map((message) => ({
      id: message.id,
      at: message.createdAt,
      icon: "email" as const,
      title: message.status === "sent" ? "Alert emailed to you" : "Alert email failed to send",
      detail: message.subject,
    })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  return (
    <>
      <PageHeader
        back={{ href: "/dashboard", label: "Dashboard" }}
        title={formatPhone(caller.phoneNumber)}
        badge={<StatusBadge map={LEAD_STATUSES} value={caller.status} />}
        description={`First called ${formatDateTime(caller.firstSeenAt, tenant.timezone)}`}
        actions={
          <a href={telHref(caller.phoneNumber)} className={buttonClass("primary")}>
            <PhoneIcon />
            Call back
          </a>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Card title="History" flush>
          {timeline.length === 0 ? (
            <EmptyState title="No activity yet" />
          ) : (
            <ol className="divide-y divide-line">
              {timeline.map((event) => (
                <li key={event.id} className="flex items-start gap-3 px-5 py-4">
                  <TimelineIcon kind={event.icon} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink">{event.title}</p>
                    {event.detail && <p className="truncate text-xs text-ink-muted">{event.detail}</p>}
                  </div>
                  <time dateTime={event.at.toISOString()} className="shrink-0 text-right text-xs text-ink-muted">
                    {formatDateTime(event.at, tenant.timezone)}
                    <br />
                    {formatRelative(event.at)}
                  </time>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card title="Update status" description="Keep track of who you've already called back.">
          <div className="space-y-2">
            {STATUS_ACTIONS.filter((option) => option.status !== caller.status).map((option) => (
              <ActionForm
                key={option.status}
                action={setLeadStatusAction.bind(null, caller.id, option.status)}
                submitLabel={option.label}
                pendingLabel="Saving…"
                variant="secondary"
                footerClassName="[&>button]:w-full"
                quiet
              />
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

function TimelineIcon({ kind }: { kind: TimelineEvent["icon"] }) {
  const styles = {
    missed: "bg-danger-soft text-danger",
    call: "bg-success-soft text-success",
    email: "bg-brand-soft text-accent",
  };
  const Icon = { missed: PhoneMissedIcon, call: PhoneIcon, email: MailIcon }[kind];

  return (
    <span className={`flex size-8 shrink-0 items-center justify-center rounded-full ${styles[kind]}`}>
      <Icon className="size-4" />
    </span>
  );
}
