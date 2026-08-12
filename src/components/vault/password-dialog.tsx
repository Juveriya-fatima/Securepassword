import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/password-input";
import { PasswordStrength } from "@/components/password-strength";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { generatePassword } from "@/lib/password";
import { useVault, type VaultEntry, type VaultDraft } from "@/lib/vault-store";

export type { VaultDraft as PasswordDraft };

export function PasswordDialog({
  open,
  onOpenChange,
  entry,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: VaultEntry | null;
  onSubmit: (draft: VaultDraft) => Promise<void>;
}) {
  const { decryptEntryPassword } = useVault();
  const isEdit = Boolean(entry);
  const [draft, setDraft] = useState<VaultDraft>({ service: "", username: "", password: "" });
  const [touched, setTouched] = useState(false);
  const [decrypting, setDecrypting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTouched(false);

    if (!entry) {
      setDraft({ service: "", username: "", password: "" });
      return;
    }

    // The existing password is only decrypted here, at the moment the user
    // explicitly opens the Edit dialog for this entry — never before.
    setDraft({ service: entry.service, username: entry.username, password: "" });
    setDecrypting(true);
    decryptEntryPassword(entry)
      .then((password) => setDraft((d) => ({ ...d, password })))
      .catch(() => toast.error("Couldn't decrypt this password. Try unlocking your vault again."))
      .finally(() => setDecrypting(false));
  }, [open, entry, decryptEntryPassword]);

  const invalid = {
    service: touched && !draft.service.trim(),
    username: touched && !draft.username.trim(),
    password: touched && !draft.password,
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (!draft.service.trim() || !draft.username.trim() || !draft.password) return;
    setSubmitting(true);
    try {
      await onSubmit({
        service: draft.service.trim(),
        username: draft.username.trim(),
        password: draft.password,
      });
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Password" : "Add Password"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the details for this saved credential."
              : "Save a credential to your vault."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="pd-service">Website / Service</Label>
            <Input
              id="pd-service"
              value={draft.service}
              placeholder="e.g. Gmail"
              onChange={(e) => setDraft((d) => ({ ...d, service: e.target.value }))}
              aria-invalid={invalid.service}
              className={invalid.service ? "border-destructive" : undefined}
            />
            {invalid.service && (
              <p className="text-xs font-medium text-destructive">Enter a website or service.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="pd-username">Username / Email</Label>
            <Input
              id="pd-username"
              value={draft.username}
              placeholder="Enter username or email"
              onChange={(e) => setDraft((d) => ({ ...d, username: e.target.value }))}
              aria-invalid={invalid.username}
              className={invalid.username ? "border-destructive" : undefined}
            />
            {invalid.username && (
              <p className="text-xs font-medium text-destructive">Enter a username or email.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="pd-password">Password</Label>
            <div className="flex gap-2">
              <PasswordInput
                id="pd-password"
                value={draft.password}
                placeholder={decrypting ? "Decrypting..." : "••••••••••••"}
                disabled={decrypting}
                onChange={(e) => setDraft((d) => ({ ...d, password: e.target.value }))}
                aria-invalid={invalid.password}
                className={invalid.password ? "border-destructive" : undefined}
              />
              <Button
                type="button"
                variant="soft"
                size="icon"
                aria-label="Generate password"
                disabled={decrypting}
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    password: generatePassword({
                      length: 16,
                      uppercase: true,
                      lowercase: true,
                      numbers: true,
                      symbols: true,
                    }),
                  }))
                }
              >
                <RefreshCw aria-hidden="true" />
              </Button>
            </div>
            {invalid.password && (
              <p className="text-xs font-medium text-destructive">Add or generate a password.</p>
            )}
            <PasswordStrength password={draft.password} className="pt-1" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="brand" disabled={decrypting || submitting}>
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" aria-hidden="true" />
                  Saving...
                </>
              ) : isEdit ? (
                "Save Changes"
              ) : (
                "Save Password"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
