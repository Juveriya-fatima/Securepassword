import { createFileRoute, Link } from "@tanstack/react-router";
import { KeyRound, ShieldAlert, ShieldCheck, Vault } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import { ServiceIcon } from "@/components/service-icon";
import { StrengthBadge } from "@/components/password-strength";
import { formatShortDate } from "@/lib/utils";
import { useAuth } from "@/lib/auth/auth-context";
import { useVault } from "@/lib/vault-store";

export const Route = createFileRoute("/app/")({
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = useAuth();
  const { entries, stats } = useVault();
  const recent = entries.slice(0, 4);
  const firstName = user?.name.split(" ")[0] ?? "";

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <header>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">
          Welcome back, {firstName} 👋
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate and manage your passwords securely.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Passwords" value={stats.total} icon={Vault} />
        <StatCard label="Strong Passwords" value={stats.strong} icon={ShieldCheck} tone="success" />
        <StatCard label="Weak Passwords" value={stats.weak} icon={ShieldAlert} tone="warning" />
      </div>

      <section className="overflow-hidden rounded-3xl border border-border bg-card bg-gradient-surface p-6 shadow-card sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-md">
            <h2 className="font-display text-xl font-bold">Generate a New Password</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick your length and character options, then save it to your vault.
            </p>
          </div>
          <Button asChild variant="brand" size="lg" className="shrink-0">
            <Link to="/app/generate">
              <KeyRound aria-hidden="true" />
              Generate Password
            </Link>
          </Button>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-lg font-bold">Recently Saved</h2>
          <Button asChild variant="ghost" size="sm">
            <Link to="/app/vault">View all</Link>
          </Button>
        </div>

        {recent.length === 0 ? (
          <EmptyState
            icon={Vault}
            title="Nothing saved yet"
            description="Generate your first secure password and save it to your vault."
            action={
              <Button asChild variant="brand">
                <Link to="/app/generate">Generate Password</Link>
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            {recent.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center gap-3 p-4 transition-colors hover:bg-accent/40"
              >
                <ServiceIcon service={entry.service} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{entry.service}</p>
                  <p className="truncate text-xs text-muted-foreground">{entry.username}</p>
                </div>
                <div className="hidden sm:block">
                  <StrengthBadge score={entry.strengthScore} />
                </div>
                <p className="shrink-0 text-xs text-muted-foreground">
                  {formatShortDate(entry.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}