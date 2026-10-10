import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/ActionForm";
import { AuthCard, Field } from "@/components/ui";
import { inputClass, linkClass } from "@/components/styles";
import { adminLoginAction } from "./actions";

export const metadata: Metadata = { title: "Admin login" };

export default function AdminLoginPage() {
  return (
    <AuthCard
      title="Admin login"
      description="For the founder only. Business owners log in from the main login page."
      footer={
        <Link href="/" className={linkClass}>
          Back to home
        </Link>
      }
    >
      <ActionForm
        action={adminLoginAction}
        submitLabel="Log in"
        pendingLabel="Checking…"
        callout
        className="space-y-4"
        footerClassName="[&>button]:w-full"
      >
        <Field label="Admin secret" htmlFor="secret" hint="The ADMIN_SECRET value from your .env.local file.">
          <input id="secret" name="secret" type="password" autoComplete="current-password" required className={inputClass} />
        </Field>
      </ActionForm>
    </AuthCard>
  );
}
