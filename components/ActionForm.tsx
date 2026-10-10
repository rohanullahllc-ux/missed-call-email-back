"use client";

import { useActionState, type ReactNode } from "react";
import type { ActionResult, FormAction } from "@/lib/forms";
import { buttonClass, type ButtonSize, type ButtonVariant } from "./styles";

export function ActionForm({
  action,
  submitLabel,
  pendingLabel = "Saving…",
  variant = "primary",
  size = "md",
  className,
  footerClassName = "flex flex-wrap items-center gap-3",
  quiet = false,
  callout = false,
  children,
}: {
  action: FormAction;
  submitLabel: ReactNode;
  pendingLabel?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  footerClassName?: string;
  /** Only report errors; success is already visible in the refreshed page. */
  quiet?: boolean;
  /** Show the result as a prominent box above the fields instead of next to the button. */
  callout?: boolean;
  children?: ReactNode;
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(action, null);
  const status = state && !(quiet && state.ok) ? <ActionStatus state={state} callout={callout} /> : null;

  return (
    <form action={formAction} className={className}>
      {callout && status}
      {children}
      <div className={footerClassName}>
        <button type="submit" disabled={pending} className={buttonClass(variant, size)}>
          {pending ? pendingLabel : submitLabel}
        </button>
        {!callout && status}
      </div>
    </form>
  );
}

function ActionStatus({ state, callout }: { state: NonNullable<ActionResult>; callout: boolean }) {
  const text = state.ok ? state.message : state.error;

  if (callout) {
    return (
      <p
        role={state.ok ? "status" : "alert"}
        className={`rounded-lg px-3 py-2.5 text-sm ${state.ok ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}
      >
        {text}
      </p>
    );
  }

  return (
    <p
      key={state.at}
      role={state.ok ? "status" : "alert"}
      className={state.ok ? "animate-fade-out-late text-sm text-success" : "text-sm text-danger"}
    >
      {text}
    </p>
  );
}
