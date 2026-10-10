import Link from "next/link";
import { buttonClass } from "@/components/styles";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <p className="text-sm font-semibold text-accent">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-muted">This page doesn&apos;t exist, or it belongs to a different account.</p>
      <Link href="/" className={`mt-6 ${buttonClass("secondary")}`}>
        Go to the home page
      </Link>
    </div>
  );
}
