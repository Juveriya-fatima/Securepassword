import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  User,
  Vault,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth/auth-context";

const NAV = [
  { label: "Dashboard", to: "/app", icon: LayoutDashboard },
  { label: "Generate Password", to: "/app/generate", icon: KeyRound },
  { label: "My Vault", to: "/app/vault", icon: Vault },
  { label: "Account", to: "/app/account", icon: User },
  { label: "Settings", to: "/app/settings", icon: Settings },
] as const;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  return (
    <nav aria-label="App" className="flex flex-1 flex-col gap-1">
      {NAV.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          activeOptions={{ exact: item.to === "/app" }}
          activeProps={{ className: "bg-accent text-accent-foreground font-semibold" }}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <item.icon className="size-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{item.label}</span>
        </Link>
      ))}
      <button
        type="button"
        onClick={async () => {
          onNavigate?.();
          await logout();
          navigate({ to: "/" });
        }}
        className="mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <LogOut className="size-4 shrink-0" aria-hidden="true" />
        Logout
      </button>
    </nav>
  );
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function UserBlock() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <div className="mt-4 flex items-center gap-3 rounded-2xl border border-sidebar-border bg-secondary/60 p-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-brand text-xs font-bold text-brand-foreground">
        {initialsOf(user.name)}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{user.name}</p>
        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
      </div>
    </div>
  );
}

export function AppSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar p-4 lg:flex lg:flex-col">
      <Logo to="/app" />
      <div className="mt-6 flex flex-1 flex-col">
        <NavLinks />
        <UserBlock />
      </div>
    </aside>
  );
}

export function AppTopBar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-lg lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Open navigation">
            <Menu aria-hidden="true" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex w-72 flex-col bg-sidebar p-4">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Logo to="/app" />
          <div className="mt-6 flex flex-1 flex-col">
            <NavLinks onNavigate={() => setOpen(false)} />
            <UserBlock />
          </div>
        </SheetContent>
      </Sheet>
      <span className="inline-flex items-center gap-2 font-display font-bold">
        <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
        SecurePass
      </span>
    </header>
  );
}