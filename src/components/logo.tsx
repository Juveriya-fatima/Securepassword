import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  to = "/",
}: {
  className?: string;
  to?: "/" | "/app";
}) {
  return (
    <Link
      to={to}
      className={cn(
        "group inline-flex items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      aria-label="SecurePass home"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-brand text-brand-foreground shadow-card transition-transform group-hover:scale-105">
        <ShieldCheck className="size-5" aria-hidden="true" />
      </span>
      <span className="font-display text-lg font-bold tracking-tight">SecurePass</span>
    </Link>
  );
}