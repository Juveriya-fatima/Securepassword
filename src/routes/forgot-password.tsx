import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Check, Copy, ShieldQuestion } from "lucide-react";
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

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [{ title: "Recover Your Vault — SecurePass" }, { name: "robots", content: "noindex" }],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { recoveryComplete } = useAuth();

  const [form, setForm] = useState({
    email: "",
    recoveryKey: "",
    newPassword: "",
    confirm: "",
  });
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [newRecoveryKey, setNewRecoveryKey] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [copied, setCopied] = useState(false);

  const errors = {
    email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email),
    recoveryKey: !form.recoveryKey.trim(),
    newPassword: form.newPassword.length < 8,
    confirm: form.confirm !== form.newPassword || !form.confirm,
  };
  const show = (key: keyof typeof errors) => touched && errors[key];
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setTouched(true);
    setFormError(null);
    if (Object.values(errors).some(Boolean)) return;

    setLoading(true);
    try {
      const { newRecoveryKey: rotated } = await recoveryComplete(
        form.email.trim(),
        form.recoveryKey.trim(),
        form.newPassword,
      );
      setNewRecoveryKey(rotated);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Recovery could not be completed.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!newRecoveryKey) return;
    const ok = await copyToClipboard(newRecoveryKey);
    if (ok) {
      setCopied(true);
      toast.success("Recovery key copied");
      setTimeout(() => setCopied(false), 1600);
    } else {
      toast.error("Couldn't copy — copy it manually instead.");
    }
  };

  return (
    <AuthLayout>
      <div className="rounded-3xl border border-border bg-card p-7 shadow-card sm:p-8">
        <span className="grid size-11 place-items-center rounded-xl bg-accent text-accent-foreground">
          <ShieldQuestion className="size-5" aria-hidden="true" />
        </span>
        <h1 className="mt-4 font-display text-2xl font-bold">Recover Your Vault</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your Recovery Key to unlock your vault and set a new password. SecurePass cannot
          decrypt your vault or reset it without this key — if you don&apos;t have it, your saved
          passwords unfortunately can&apos;t be recovered.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="fp-email">Email</Label>
            <Input
              id="fp-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={set("email")}
              aria-invalid={show("email")}
              className={show("email") ? "border-destructive" : undefined}
            />
            {show("email") && (
              <p className="text-xs font-medium text-destructive">Enter a valid email address.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="fp-recovery-key">Recovery Key</Label>
            <Input
              id="fp-recovery-key"
              value={form.recoveryKey}
              onChange={set("recoveryKey")}
              placeholder="Paste your recovery key"
              className={show("recoveryKey") ? "border-destructive" : undefined}
              aria-invalid={show("recoveryKey")}
            />
            {show("recoveryKey") && (
              <p className="text-xs font-medium text-destructive">Enter your recovery key.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="fp-new-password">New Password</Label>
            <PasswordInput
              id="fp-new-password"
              value={form.newPassword}
              onChange={set("newPassword")}
              autoComplete="new-password"
              placeholder="Create a new password"
              aria-invalid={show("newPassword")}
              className={show("newPassword") ? "border-destructive" : undefined}
            />
            {show("newPassword") && (
              <p className="text-xs font-medium text-destructive">Use at least 8 characters.</p>
            )}
            <PasswordStrength password={form.newPassword} className="pt-1" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fp-confirm">Confirm New Password</Label>
            <PasswordInput
              id="fp-confirm"
              value={form.confirm}
              onChange={set("confirm")}
              autoComplete="new-password"
              placeholder="Re-enter your new password"
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
            {loading ? "Recovering..." : "Recover Vault"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Remembered your password?{" "}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Back to Login
          </Link>
        </p>
      </div>

      <Dialog open={newRecoveryKey !== null} onOpenChange={() => {}}>
        <DialogContent
          className="sm:max-w-md"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-warning/12 text-warning">
              <AlertTriangle className="size-7" aria-hidden="true" />
            </span>
            <DialogTitle className="text-center">Save Your New Recovery Key</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            Your password has been reset and your vault is intact — nothing was lost. Your old
            recovery key no longer works; here is your new one. Save it somewhere safe.
          </p>

          <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary/60 p-3">
            <code className="min-w-0 flex-1 break-all font-mono text-sm">{newRecoveryKey}</code>
            <Button type="button" variant="soft" size="icon" aria-label="Copy recovery key" onClick={handleCopy}>
              {copied ? <Check className="text-success" aria-hidden="true" /> : <Copy aria-hidden="true" />}
            </Button>
          </div>

          <div className="flex items-start gap-2 pt-2">
            <Checkbox
              id="ack-new-recovery-key"
              checked={acknowledged}
              onCheckedChange={(v) => setAcknowledged(v === true)}
            />
            <Label htmlFor="ack-new-recovery-key" className="text-sm font-normal text-muted-foreground">
              I have saved my new recovery key somewhere safe.
            </Label>
          </div>

          <DialogFooter>
            <Button
              variant="brand"
              className="w-full"
              disabled={!acknowledged}
              onClick={() => navigate({ to: "/login" })}
            >
              Continue to Login
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthLayout>
  );
}
