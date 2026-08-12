import { useState } from "react";
import { toast } from "sonner";
import { Check, Copy, Eye, EyeOff, Loader2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ServiceIcon } from "@/components/service-icon";
import { StrengthBadge } from "@/components/password-strength";
import { copyToClipboard } from "@/lib/password";
import { formatShortDate } from "@/lib/utils";
import { useVault, type VaultEntry } from "@/lib/vault-store";

export function PasswordCard({
  entry,
  onEdit,
  onDelete,
}: {
  entry: VaultEntry;
  onEdit: (entry: VaultEntry) => void;
  onDelete: (entry: VaultEntry) => void;
}) {
  const { decryptEntryPassword } = useVault();
  const [revealed, setRevealed] = useState<string | null>(null);
  const [busy, setBusy] = useState<"show" | "copy" | null>(null);
  const [copied, setCopied] = useState(false);

  const visible = revealed !== null;

  const handleToggleVisible = async () => {
    if (visible) {
      setRevealed(null);
      return;
    }
    setBusy("show");
    try {
      const plaintext = await decryptEntryPassword(entry);
      setRevealed(plaintext);
    } catch {
      toast.error("Couldn't decrypt this password. Try unlocking your vault again.");
    } finally {
      setBusy(null);
    }
  };

  const handleCopy = async () => {
    setBusy("copy");
    try {
      const plaintext = revealed ?? (await decryptEntryPassword(entry));
      const ok = await copyToClipboard(plaintext);
      if (!ok) {
        toast.error("Couldn't copy — copy it manually instead.");
        return;
      }
      setCopied(true);
      toast.success("Copied!", { description: `${entry.service} password copied.` });
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Couldn't decrypt this password. Try unlocking your vault again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <article className="group flex flex-col rounded-2xl border border-border bg-card p-5 shadow-card transition-all duration-200 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lift">
      <div className="flex items-start gap-3">
        <ServiceIcon service={entry.service} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-base font-bold">{entry.service}</h3>
          <p className="truncate text-sm text-muted-foreground">{entry.username}</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-secondary/70 px-3.5 py-3">
        <p className="text-xs font-medium text-muted-foreground">Password</p>
        <p className="mt-1 truncate font-mono text-sm font-semibold transition-all duration-300">
          {visible ? revealed : "•".repeat(16)}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <StrengthBadge score={entry.strengthScore} />
        <p className="text-xs text-muted-foreground">Created {formatShortDate(entry.createdAt)}</p>
      </div>

      <div className="mt-4 flex items-center gap-1.5 border-t border-border pt-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleToggleVisible}
          disabled={busy === "show"}
          aria-label={visible ? `Hide ${entry.service} password` : `Show ${entry.service} password`}
        >
          {busy === "show" ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : visible ? (
            <EyeOff aria-hidden="true" />
          ) : (
            <Eye aria-hidden="true" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCopy}
          disabled={busy === "copy"}
          aria-label={`Copy ${entry.service} password`}
        >
          {busy === "copy" ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : copied ? (
            <Check className="text-success" aria-hidden="true" />
          ) : (
            <Copy aria-hidden="true" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(entry)}
          aria-label={`Edit ${entry.service}`}
        >
          <Pencil aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => onDelete(entry)}
          aria-label={`Delete ${entry.service}`}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </div>
    </article>
  );
}
