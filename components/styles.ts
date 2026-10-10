const buttonBase =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60";

const buttonVariants = {
  primary: "bg-brand text-brand-ink shadow-xs hover:bg-brand-hover",
  secondary: "border border-line bg-surface text-ink shadow-xs hover:bg-surface-muted",
  ghost: "text-ink-muted hover:bg-surface-muted hover:text-ink",
  danger: "border border-line bg-surface text-danger shadow-xs hover:bg-danger-soft",
};

const buttonSizes = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
};

export type ButtonVariant = keyof typeof buttonVariants;
export type ButtonSize = keyof typeof buttonSizes;

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md"): string {
  return `${buttonBase} ${buttonVariants[variant]} ${buttonSizes[size]}`;
}

const fieldBase =
  "rounded-lg border border-line bg-surface text-sm text-ink shadow-xs placeholder:text-ink-muted/70 focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand/20";

export const inputClass = `block w-full px-3 py-2 ${fieldBase}`;

// Pair with a width class (e.g. w-32); inputClass always fills its container.
export const compactInputClass = `h-8 px-2.5 ${fieldBase}`;

export const linkClass = "font-medium text-accent hover:underline";

export const tableClass = "w-full text-left text-sm [&_tr:last-child_td]:border-b-0";
export const thClass =
  "border-b border-line bg-surface-muted px-5 py-2.5 text-xs font-medium uppercase tracking-wide text-ink-muted";
export const tdClass = "border-b border-line px-5 py-3 align-middle";
