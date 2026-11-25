import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { cn } from "@/lib/utils";

/**
 * Shared chrome for every route except the marketing home page, which needs a
 * transparent hero header. `tone="light"` is the default for app surfaces.
 */
export function PageShell({
  children,
  tone = "light",
  wide = false,
  className,
}: {
  children: ReactNode;
  tone?: "light" | "dark";
  wide?: boolean;
  className?: string;
}) {
  return (
    <>
      <SiteHeader variant={tone} />
      <main
        id="main"
        className={cn("min-h-screen pt-[76px]", className)}
      >
        <div className={wide ? undefined : "container-lenzi"}>{children}</div>
      </main>
      <SiteFooter />
    </>
  );
}
