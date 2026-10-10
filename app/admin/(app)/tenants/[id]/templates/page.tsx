import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireAdmin } from "@/lib/auth/dal";
import { appBaseUrl } from "@/lib/config";
import { buildMissedCallEmail } from "@/lib/email/messages";
import { TEMPLATE_VARIABLES, TRIGGERS, TRIGGER_TYPES, findTemplate } from "@/lib/templates/templates";
import { ActionForm } from "@/components/ActionForm";
import { Badge, Card, Field, PageHeader } from "@/components/ui";
import { inputClass } from "@/components/styles";
import { saveTemplateAction, sendTestEmailAction } from "./actions";
import { SAMPLE_CALLER_PHONE } from "./sample";

export const metadata: Metadata = { title: "Email templates" };

export default async function TemplatesPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { id } });
  if (!tenant) {
    notFound();
  }

  const slots = await Promise.all(
    TRIGGER_TYPES.map(async (triggerType) => {
      const saved = await findTemplate(tenant.id, triggerType, { activeOnly: false });
      const content = {
        subject: saved?.subject || TRIGGERS[triggerType].defaults.subject,
        body: saved?.body || TRIGGERS[triggerType].defaults.body,
      };
      const preview = buildMissedCallEmail({
        template: content,
        businessName: tenant.name,
        callerPhone: SAMPLE_CALLER_PHONE,
        calledAt: new Date(),
        timeZone: tenant.timezone,
        leadUrl: `${appBaseUrl()}/dashboard`,
      });
      return { triggerType, saved, content, preview };
    })
  );

  return (
    <>
      <PageHeader
        back={{ href: `/admin/tenants/${tenant.id}`, label: tenant.name }}
        title="Email templates"
        description={`What ${tenant.ownerNotificationEmail} receives when ${tenant.name} misses a call.`}
      />

      <Card
        className="mb-6"
        title="Variables you can use"
        description="Type these into a subject or message — each is replaced with the real details of the call."
      >
        <dl className="grid gap-4 sm:grid-cols-3">
          {TEMPLATE_VARIABLES.map((variable) => (
            <div key={variable.name}>
              <dt>
                <code className="rounded-md bg-surface-muted px-1.5 py-0.5 font-mono text-xs text-ink">{`{{${variable.name}}}`}</code>
              </dt>
              <dd className="mt-1.5 text-xs text-ink-muted">{variable.description}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <div className="space-y-6">
        {slots.map(({ triggerType, saved, content, preview }) => {
          const trigger = TRIGGERS[triggerType];
          return (
            <Card
              key={triggerType}
              title={
                <span className="flex flex-wrap items-center gap-2">
                  {trigger.label}
                  {!saved ? (
                    <Badge>{triggerType === "missed_call" ? "Using default wording" : "Not set up"}</Badge>
                  ) : saved.isActive ? (
                    <Badge tone="success">On</Badge>
                  ) : (
                    <Badge>Off</Badge>
                  )}
                </span>
              }
              description={trigger.description}
              actions={
                <ActionForm
                  action={sendTestEmailAction.bind(null, tenant.id, triggerType)}
                  submitLabel="Send me a test"
                  pendingLabel="Sending…"
                  variant="secondary"
                  size="sm"
                />
              }
            >
              <div className="grid gap-6 lg:grid-cols-2">
                <ActionForm
                  action={saveTemplateAction.bind(null, tenant.id, triggerType)}
                  submitLabel={saved ? "Save template" : "Save and turn on"}
                  className="space-y-4"
                >
                  <Field label="Subject" htmlFor={`${triggerType}-subject`}>
                    <input
                      id={`${triggerType}-subject`}
                      name="subject"
                      defaultValue={content.subject}
                      required
                      className={inputClass}
                    />
                  </Field>
                  <Field
                    label="Message"
                    htmlFor={`${triggerType}-body`}
                    hint="Leave a blank line to start a new paragraph. The call-back button is added automatically."
                  >
                    <textarea
                      id={`${triggerType}-body`}
                      name="body"
                      defaultValue={content.body}
                      required
                      rows={7}
                      className={`${inputClass} resize-y leading-relaxed`}
                    />
                  </Field>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-ink">
                      <input
                        type="checkbox"
                        name="isActive"
                        defaultChecked={saved ? saved.isActive : true}
                        className="size-4 accent-brand"
                      />
                      Use this template
                    </label>
                    <p className="mt-1.5 text-xs text-ink-muted">{trigger.whenOff}</p>
                  </div>
                </ActionForm>

                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
                    Preview{saved ? "" : " · default wording"}
                  </p>
                  <iframe
                    title={`${trigger.label} email preview`}
                    srcDoc={preview.html}
                    sandbox=""
                    className="h-[460px] w-full rounded-lg border border-line bg-white"
                  />
                  <p className="mt-2 text-xs text-ink-muted">
                    Subject: <span className="text-ink">{preview.subject}</span>
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
