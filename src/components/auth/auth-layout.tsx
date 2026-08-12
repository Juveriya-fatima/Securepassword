import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { KeyRound, Lock, Search, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/logo";

const POINTS = [
  { icon: KeyRound, text: "Customizable, strong password generation" },
  { icon: Lock, text: "Your saved credentials, neatly organized" },
  { icon: Search, text: "Find any credential in seconds" },
];

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-gradient-brand p-10 text-brand-foreground lg:flex">
        <Logo className="text-brand-foreground [&>span:first-child]:bg-brand-foreground/15" />
        <div className="max-w-sm">
          <ShieldCheck className="size-12 opacity-90" aria-hidden="true" />
          <h2 className="mt-6 font-display text-3xl font-bold leading-tight">
            Strong passwords, quietly organized.
          </h2>
          <ul className="mt-8 space-y-4">
            {POINTS.map((point) => (
              <li key={point.text} className="flex items-start gap-3 text-sm opacity-90">
                <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-brand-foreground/15">
                  <point.icon className="size-4" aria-hidden="true" />
                </span>
                {point.text}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs opacity-70">© 2026 SecurePass</p>
      </aside>

      <main className="flex flex-col justify-center px-4 py-10 sm:px-8">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          {children}
          <p className="mt-8 text-center text-xs text-muted-foreground">
            <Link to="/" className="hover:text-foreground">
              ← Back to home
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}