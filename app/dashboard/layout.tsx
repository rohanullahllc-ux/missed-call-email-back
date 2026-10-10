import Link from "next/link";
import type { ReactNode } from "react";
import { requireTenant } from "@/lib/auth/dal";
import { Brand } from "@/components/ui";
import { buttonClass } from "@/components/styles";
import { logoutAction } from "./actions";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const tenant = await requireTenant();

  return (
    <div className="flex min-h-full min-w-0 flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4 sm:gap-4 sm:px-6">
          <Link href="/dashboard" aria-label="Dashboard home">
            <Brand />
          </Link>
          <span className="hidden h-5 w-px bg-line sm:block" aria-hidden />
          <span className="truncate text-sm font-medium text-ink">{tenant.name}</span>
          <form action={logoutAction} className="ml-auto">
            <button type="submit" className={buttonClass("ghost", "sm")}>
              Log out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full min-w-0 max-w-5xl flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
