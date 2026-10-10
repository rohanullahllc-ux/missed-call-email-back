"use client";

import { useEffect } from "react";
import { buttonClass } from "@/components/styles";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <p className="text-sm font-semibold text-danger">Something went wrong</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">We couldn&apos;t load this page</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-muted">
        This is usually temporary — for example, the database briefly couldn&apos;t be reached. Please try again.
      </p>
      <button type="button" onClick={() => retry()} className={`mt-6 ${buttonClass("primary")}`}>
        Try again
      </button>
    </div>
  );
}
