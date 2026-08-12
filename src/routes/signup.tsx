import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/password-input";
import { PasswordStrength } from "@/components/password-strength";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { copyToClipboard } from "@/lib/password";
import { useAuth } from "@/lib/auth/auth-context";
import { ApiClientError } from "@/lib/api-client";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create Account — SecurePass" },
      {
        name: "description",
        content:
          "Create a SecurePass account to start generating strong passwords and managing them in your vault.",
      },
      { property: "og:title", content: "Create your SecurePass account" },
      {
        property: "og:description",
        content: "Start generating and managing your passwords securely.",
      },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [recoveryKey, setRecoveryKey] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [copied, setCopied] = useState(false);

  const errors = {
    name: !form.name.trim(),
    email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email),
    password: form.password.length < 8,
    confirm: form.confirm !== form.password || !form.confirm,
  };
  const show = (key: keyof typeof errors) => touched && errors[key];

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setTouched(true);
    setFormError(null);
    if (Object.values(errors).some(Boolean)) return;

    setLoading(true);
    try {
      const { recoveryKey: newRecoveryKey } = await register(
        form.name.trim(),
        form.email.trim(),
        form.password,
      );
      // Shown once, right after account creation — this is the only chance
      // to save it; the server never stores it in a recoverable form.
      setRecoveryKey(newRecoveryKey);
    } catch (err) {
      setFormError(
        err instanceof ApiClientError ? err.message : "Couldn't create your account. Try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleCopyRecoveryKey = async () => {
    if (!recoveryKey) return;
    const ok = await copyToClipboard(recoveryKey);
    if (ok) {
      setCopied(true);
      toast.success("Recovery key copied");
      setTimeout(() => setCopied(false), 1600);
    } else {
      toast.error("Couldn't copy — copy it manually instead.");
    }
  };

  const handleContinue = () => {
    if (!acknowledged) return;
    navigate({ to: "/app" });
  };

  return (
    <AuthLayout>
      <div className="rounded-3xl border border-border bg-card p-7 shadow-card sm:p-8">
        <h1 className="font-display text-2xl font-bold">Create Your SecurePass Account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Start generating and managing your passwords securely.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="su-name">Full Name</Label>
            <Input
              id="su-name"
              value={form.name}
              onChange={set("name")}
              autoComplete="name"
              placeholder="Alex Morgan"
              aria-invalid={show("name")}
              className={show("name") ? "border-destructive" : undefined}
            />
            {show("name") && (
              <p className="text-xs font-medium text-destructive">Enter your full name.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="su-email">Email</Label>
            <Input
              id="su-email"
              type="email"
              value={form.email}
              onChange={set("email")}
              autoComplete="email"
              placeholder="you@example.com"
              aria-invalid={show("email")}
              className={show("email") ? "border-destructive" : undefined}
            />
            {show("email") && (
              <p className="text-xs font-medium text-destructive">Enter a valid email address.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="su-password">Password</Label>
            <PasswordInput
              id="su-password"
              value={form.password}
              onChange={set("password")}
              autoComplete="new-password"
              placeholder="Create a strong password"
              aria-invalid={show("password")}
              className={show("password") ? "border-destructive" : undefined}
            />
            {show("password") && (
              <p className="text-xs font-medium text-destructive">
                Use at least 8 characters.
              </p>
            )}
            <PasswordStrength password={form.password} className="pt-1" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="su-confirm">Confirm Password</Label>
            <PasswordInput
              id="su-confirm"
              value={form.confirm}
              onChange={set("confirm")}
              autoComplete="new-password"
              placeholder="Re-enter your password"
              aria-invalid={show("confirm")}
              className={show("confirm") ? "border-destructive" : undefined}
            />
            {show("confirm") && (
              <p className="text-xs font-medium text-destructive">Passwords don&apos;t match.</p>
            )}
          </div>

          {formError && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
              {formError}
            </p>
          )}

          <Button type="submit" variant="brand" size="lg" className="w-full" disabled={loading}>
            {loading ? "Creating account..." : "Create Account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Login
          </Link>
        </p>
      </div>

      <Dialog open={recoveryKey !== null} onOpenChange={() => {}}>
        <DialogContent
          className="sm:max-w-md"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-warning/12 text-warning">
              <AlertTriangle className="size-7" aria-hidden="true" />
            </span>
            <DialogTitle className="text-center">Save Your Recovery Key</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            This key is the <strong>only</strong> way to get back into your vault if you forget
            your password. SecurePass encrypts your vault so that only you can decrypt it — we
            cannot see it, and we cannot reset it for you. If you lose both your password and this
            key, your saved passwords cannot be recovered.
          </p>

          <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary/60 p-3">
            <code className="min-w-0 flex-1 break-all font-mono text-sm">{recoveryKey}</code>
            <Button
              type="button"
              variant="soft"
              size="icon"
              aria-label="Copy recovery key"
              onClick={handleCopyRecoveryKey}
            >
              {copied ? <Check className="text-success" aria-hidden="true" /> : <Copy aria-hidden="true" />}
            </Button>
          </div>

          <div className="flex items-start gap-2 pt-2">
            <Checkbox
              id="ack-recovery-key"
              checked={acknowledged}
              onCheckedChange={(v) => setAcknowledged(v === true)}
            />
            <Label htmlFor="ack-recovery-key" className="text-sm font-normal text-muted-foreground">
              I have saved my recovery key somewhere safe. I understand SecurePass cannot recover
              my vault without it.
            </Label>
          </div>

          <DialogFooter>
            <Button variant="brand" className="w-full" disabled={!acknowledged} onClick={handleContinue}>
              Continue to SecurePass
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthLayout>
  );
}
