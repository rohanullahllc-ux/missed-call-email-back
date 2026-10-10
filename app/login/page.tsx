import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/ActionForm";
import { AuthCard, Field } from "@/components/ui";
import { inputClass, linkClass } from "@/components/styles";
import { requestLoginLinkAction } from "./actions";

export const metadata: Metadata = { title: "Log in" };

export default async function OwnerLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return (
    <AuthCard
      title="Log in to your dashboard"
      description="Enter the email your business is registered with. We'll send you a one-time login link — no password needed."
      footer={
        <Link href="/" className={linkClass}>
          Back to home
        </Link>
      }
    >
      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-danger-soft px-3 py-2.5 text-sm text-danger">
          {error === "unavailable"
            ? "We couldn't log you in just now — please click the link in your email again in a moment."
            : "That login link has expired or was already used. Request a new one below."}
        </p>
      )}
      <ActionForm
        action={requestLoginLinkAction}
        submitLabel="Email me a login link"
        pendingLabel="Sending…"
        callout
        className="space-y-4"
        footerClassName="[&>button]:w-full"
      >
        <Field label="Email address" htmlFor="email">
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@yourbusiness.com"
            className={inputClass}
          />
        </Field>
      </ActionForm>
    </AuthCard>
  );
}
