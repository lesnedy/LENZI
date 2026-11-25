import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  tone = "dark",
  compact = false,
  className,
}: {
  tone?: "dark" | "light";
  compact?: boolean;
  className?: string;
}) {
  const ink = tone === "light" ? "#FFFFFF" : "#101B17";
  const tile = tone === "light" ? "#13A86B" : "#087A4B";

  return (
    <Link
      href="/"
      aria-label="LENZI home"
      className={cn("group inline-flex items-center gap-3", className)}
    >
      <svg
        width="36"
        height="36"
        viewBox="0 0 40 40"
        fill="none"
        aria-hidden="true"
        className="shrink-0 transition-transform duration-300 group-hover:-rotate-3"
      >
        <rect width="40" height="40" rx="12" fill={tile} />
        <path
          d="M11.5 29.5V14.2C11.5 12.7 12.7 11.5 14.2 11.5H23"
          stroke="#B8ED76"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="29.5" cy="11.5" r="3.2" fill="#B8ED76" />
        <circle cx="11.5" cy="29.5" r="2.2" fill={tone === "light" ? "#101B17" : "#FFFFFF"} />
      </svg>
      {!compact && (
        <span
          className="text-[19px] font-extrabold leading-none tracking-[0.2em]"
          style={{ color: ink }}
        >
          LENZI
          <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-lime align-middle" />
        </span>
      )}
    </Link>
  );
}
