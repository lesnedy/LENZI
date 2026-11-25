import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "dark" | "outline" | "ghost" | "lime";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-leaf text-white shadow-[0_10px_30px_-12px_rgba(19,168,107,0.8)] hover:bg-deep hover:shadow-[0_16px_36px_-14px_rgba(8,122,75,0.7)]",
  dark: "bg-ink text-white hover:bg-forest-800",
  outline:
    "border border-stone-300 bg-white/60 text-ink hover:border-forest-500 hover:bg-white",
  ghost: "text-ink hover:bg-forest-50",
  lime: "bg-lime text-ink hover:bg-[#c6f58c]",
};

const sizes: Record<Size, string> = {
  sm: "h-10 px-4 text-[13px]",
  md: "h-12 px-5 text-sm",
  lg: "h-14 px-7 text-[15px]",
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-bold tracking-[-0.01em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]";

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  return (
    <Link
      href={href}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </Link>
  );
}
