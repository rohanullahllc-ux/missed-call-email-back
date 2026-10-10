import Link from "next/link";
import { APP_NAME } from "@/lib/config";
import { Badge, Brand, MailIcon, PhoneIcon, PhoneMissedIcon } from "@/components/ui";
import { buttonClass } from "@/components/styles";

const STEPS = [
  {
    icon: PhoneIcon,
    title: "A customer calls",
    text: "Your business number rings your cell, just like it does today.",
  },
  {
    icon: PhoneMissedIcon,
    title: "You can't pick up",
    text: "On a job, driving, or already on another call — it happens.",
  },
  {
    icon: MailIcon,
    title: "You get an email in seconds",
    text: "With the caller's number and a one-tap button to call them straight back.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
        <Brand />
        <Link href="/login" className={buttonClass("secondary", "sm")}>
          Log in
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center px-4 pt-14 pb-20 text-center sm:px-6 sm:pt-20">
        <Badge tone="brand">For busy business owners</Badge>
        <h1 className="mt-5 max-w-2xl text-4xl font-semibold tracking-tight text-balance text-ink sm:text-5xl">
          Never lose a customer to a missed call.
        </h1>
        <p className="mt-4 max-w-xl text-lg text-pretty text-ink-muted">
          When you can&apos;t answer, we email you the caller&apos;s number within seconds — so you can call back before they
          call someone else.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/login" className={buttonClass("primary")}>
            Business owner login
          </Link>
          <Link href="/admin" className={buttonClass("secondary")}>
            Admin
          </Link>
        </div>

        <ol className="mt-16 grid w-full gap-4 text-left sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="rounded-xl border border-line bg-surface p-5 shadow-xs">
              <span className="flex size-9 items-center justify-center rounded-lg bg-brand-soft text-accent">
                <step.icon className="size-4.5" />
              </span>
              <p className="mt-4 text-xs font-medium text-ink-muted">Step {index + 1}</p>
              <p className="mt-1 font-semibold text-ink">{step.title}</p>
              <p className="mt-1 text-sm text-ink-muted">{step.text}</p>
            </li>
          ))}
        </ol>
      </main>

      <footer className="border-t border-line py-6 text-center text-xs text-ink-muted">{APP_NAME}</footer>
    </div>
  );
}
