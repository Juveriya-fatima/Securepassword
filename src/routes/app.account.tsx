import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { KeyRound, LogOut, Mail, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/password-input";
import { Separator } from "@/components/ui/separator";
import { ConfirmDeleteDialog } from "@/components/vault/confirm-delete-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth/auth-context";
import { api, ApiClientError } from "@/lib/api-client";

export const Route = createFileRoute("/app/account")({
  component: AccountPage,
});

function AccountPage() {
  const navigate = useNavigate();
  const { user, refreshUser, logout, changePassword } = useAuth();

  const [name, setName] = useState(user?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [pwDialogOpen, setPwDialogOpen] = useState(false);
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await api.patch<{ user: { id: string; name: string; email: string } }>(
        "/api/account",
        { name: name.trim() },
      );
      refreshUser(res.user);
      toast.success("Changes saved", { description: "Your profile has been updated." });
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Couldn't save your profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setPwError(null);
    if (pwForm.next.length < 8) {
      setPwError("New password must be at least 8 characters.");
      return;
    }
    if (pwForm.next !== pwForm.confirm) {
      setPwError("New passwords don't match.");
      return;
    }
    setPwSaving(true);
    try {
      await changePassword(pwForm.current, pwForm.next);
      toast.success("Password changed", {
        description: "Your vault stays intact — nothing was lost.",
      });
      setPwDialogOpen(false);
      setPwForm({ current: "", next: "", confirm: "" });
    } catch (err) {
      setPwError(err instanceof Error ? err.message : "Couldn't change your password.");
    } finally {
      setPwSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await api.delete("/api/account");
      toast.success("Account deleted");
      await logout();
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Couldn't delete your account.");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (!user) return null;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Account Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your profile and account preferences.
        </p>
      </header>

      <section className="flex items-center gap-4 rounded-3xl border border-border bg-card bg-gradient-surface p-6 shadow-card">
        <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-gradient-brand font-display text-lg font-bold text-brand-foreground">
          {user.name
            .trim()
            .split(/\s+/)
            .map((p) => p[0])
            .slice(0, 2)
            .join("")
            .toUpperCase()}
        </span>
        <div className="min-w-0">
          <h2 className="truncate font-display text-lg font-bold">{user.name}</h2>
          <p className="truncate text-sm text-muted-foreground">{user.email}</p>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
        <h2 className="font-display text-lg font-bold">Personal Information</h2>
        <form onSubmit={handleSave} className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="acc-name">Full Name</Label>
            <Input id="acc-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="acc-email">Email</Label>
            <Input id="acc-email" type="email" value={user.email} disabled readOnly />
          </div>
          <Button type="submit" variant="brand" disabled={saving || !name.trim()}>
            <Mail aria-hidden="true" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </section>

      <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
        <h2 className="font-display text-lg font-bold">Security</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Update the password you use to sign in to SecurePass. Your vault stays intact — only
          your password changes.
        </p>
        <Button variant="outline" className="mt-4" onClick={() => setPwDialogOpen(true)}>
          <KeyRound aria-hidden="true" />
          Change Password
        </Button>
      </section>

      <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
        <h2 className="font-display text-lg font-bold">Account</h2>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            onClick={async () => {
              await logout();
              navigate({ to: "/" });
            }}
          >
            <LogOut aria-hidden="true" />
            Logout
          </Button>
          <Separator orientation="vertical" className="hidden h-8 sm:block" />
          <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
            <Trash2 aria-hidden="true" />
            Delete Account
          </Button>
        </div>
      </section>

      <Dialog open={pwDialogOpen} onOpenChange={setPwDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Your Vault Key stays the same — we just re-wrap it with your new password. Nothing
              in your vault is re-encrypted or lost.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pw-current">Current Password</Label>
              <PasswordInput
                id="pw-current"
                value={pwForm.current}
                onChange={(e) => setPwForm((f) => ({ ...f, current: e.target.value }))}
                autoComplete="current-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw-next">New Password</Label>
              <PasswordInput
                id="pw-next"
                value={pwForm.next}
                onChange={(e) => setPwForm((f) => ({ ...f, next: e.target.value }))}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw-confirm">Confirm New Password</Label>
              <PasswordInput
                id="pw-confirm"
                value={pwForm.confirm}
                onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))}
                autoComplete="new-password"
              />
            </div>
            {pwError && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
                {pwError}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPwDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="brand" disabled={pwSaving}>
                {pwSaving ? "Saving..." : "Change Password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete Account?"
        description="Are you sure you want to delete your account and all saved passwords? This action cannot be undone."
        confirmLabel={deleting ? "Deleting..." : "Delete Account"}
        onConfirm={handleDeleteAccount}
      />
    </div>
  );
}
