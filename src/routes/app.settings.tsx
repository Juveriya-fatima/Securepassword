import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { KeyRound, Laptop, LogOut, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/auth-context";

export const Route = createFileRoute("/app/settings")({
  component: SettingsPage,
});

const THEMES = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Laptop },
] as const;

function SettingsPage() {
  const { logout } = useAuth();
  const [theme, setTheme] = useState<"light" | "dark" | "system">("light");
  const [showStrength, setShowStrength] = useState(true);
  const [autoCopy, setAutoCopy] = useState(false);

  // UI-only theme preview: toggles the `dark` class on the document.
  useEffect(() => {
    const prefersDark =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = theme === "dark" || (theme === "system" && prefersDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, [theme]);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tune how SecurePass looks and behaves.
        </p>
      </header>

      <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
        <h2 className="font-display text-lg font-bold">Appearance</h2>
        <p className="mt-1 text-sm text-muted-foreground">Theme</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Theme">
          {THEMES.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={theme === option.value}
              onClick={() => setTheme(option.value)}
              className={cn(
                "flex items-center gap-3 rounded-2xl border p-4 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                theme === option.value
                  ? "border-primary/40 bg-accent text-accent-foreground shadow-card"
                  : "border-border hover:bg-accent/40",
              )}
            >
              <option.icon className="size-4" aria-hidden="true" />
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
        <h2 className="font-display text-lg font-bold">Preferences</h2>
        <div className="mt-4 divide-y divide-border">
          <div className="flex items-center justify-between gap-4 py-4">
            <Label htmlFor="pref-strength" className="font-medium">
              Show password strength
            </Label>
            <Switch id="pref-strength" checked={showStrength} onCheckedChange={setShowStrength} />
          </div>
          <div className="flex items-center justify-between gap-4 py-4">
            <Label htmlFor="pref-copy" className="font-medium">
              Auto-copy generated password
            </Label>
            <Switch id="pref-copy" checked={autoCopy} onCheckedChange={setAutoCopy} />
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
        <h2 className="font-display text-lg font-bold">Security</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Log out of this device, or change the password on your account page.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => void logout()}>
            <LogOut aria-hidden="true" />
            Log out this device
          </Button>
          <Button variant="outline" asChild>
            <Link to="/app/account">
              <KeyRound aria-hidden="true" />
              Change password
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}