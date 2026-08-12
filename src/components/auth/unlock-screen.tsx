import { useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/password-input";
import { useAuth } from "@/lib/auth/auth-context";

export function UnlockScreen() {
  const { unlock, logout, user } = useAuth();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await unlock(password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't unlock your vault.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-7 shadow-card sm:p-8">
        <span className="grid size-11 place-items-center rounded-xl bg-accent text-accent-foreground">
          <Lock className="size-5" aria-hidden="true" />
        </span>
        <h1 className="mt-4 font-display text-2xl font-bold">Unlock Your Vault</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          For your security, your vault re-locks whenever the page fully reloads. Enter your
          password to decrypt it again for {user?.email}.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="unlock-password">Password</Label>
            <PasswordInput
              id="unlock-password"
              autoFocus
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" variant="brand" size="lg" className="w-full" disabled={loading}>
            {loading ? "Unlocking..." : "Unlock"}
          </Button>
          <Button type="button" variant="ghost" className="w-full" onClick={() => void logout()}>
            Log out instead
          </Button>
        </form>
      </div>
    </div>
  );
}
