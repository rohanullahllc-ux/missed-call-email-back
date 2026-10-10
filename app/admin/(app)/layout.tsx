import Link from "next/link";
import type { ReactNode } from "react";
import { NavLink } from "@/components/NavLink";
import { Brand } from "@/components/ui";
import { buttonClass } from "@/components/styles";
import { adminLogoutAction } from "../login/actions";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full min-w-0 flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:gap-6 sm:px-6">
          <Link href="/admin/tenants" aria-label="Admin home">
            <Brand suffix="Admin" />
          </Link>
          <nav className="flex items-center gap-1">
            <NavLink href="/admin/tenants">Businesses</NavLink>
            <NavLink href="/admin/interactions">Calls</NavLink>
          </nav>
          <form action={adminLogoutAction} className="ml-auto">
            <button type="submit" className={buttonClass("ghost", "sm")}>
              Log out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full min-w-0 max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
