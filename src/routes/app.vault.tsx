import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plus, Search, SearchX, Vault } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/empty-state";
import { PasswordCard } from "@/components/vault/password-card";
import { PasswordDialog, type PasswordDraft } from "@/components/vault/password-dialog";
import { ConfirmDeleteDialog } from "@/components/vault/confirm-delete-dialog";
import { useVault, type VaultEntry } from "@/lib/vault-store";

export const Route = createFileRoute("/app/vault")({
  component: VaultPage,
});

function VaultPage() {
  const { entries, loading, error, addEntry, updateEntry, removeEntry } = useVault();
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<VaultEntry | null>(null);
  const [deleting, setDeleting] = useState<VaultEntry | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (entry) =>
        entry.service.toLowerCase().includes(q) || entry.username.toLowerCase().includes(q),
    );
  }, [entries, query]);

  const handleSubmit = async (draft: PasswordDraft) => {
    if (editing) {
      await updateEntry(editing.id, draft);
      toast.success("Changes saved", { description: `${draft.service} has been updated.` });
    } else {
      await addEntry(draft);
      toast.success("Password Saved", {
        description: `${draft.service} password has been saved to your vault.`,
      });
    }
    setEditing(null);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await removeEntry(deleting.id);
      toast.success("Password deleted", { description: `${deleting.service} was removed.` });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't delete this password.");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      <header>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">My Password Vault</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your saved passwords in one place.
        </p>
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
        <div className="relative min-w-0 sm:max-w-md sm:flex-1">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search passwords"
            placeholder="Search by website or username..."
            className="h-11 rounded-xl pl-10"
          />
        </div>
        <Button
          variant="brand"
          className="h-11 shrink-0"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus aria-hidden="true" />
          <span className="hidden sm:inline">Add Password</span>
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-2xl border border-border bg-card/60"
            />
          ))}
        </div>
      ) : error ? (
        <EmptyState
          icon={SearchX}
          title="Couldn't load your vault"
          description={error}
          action={
            <Button variant="outline" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          }
        />
      ) : entries.length === 0 ? (
        <EmptyState
          icon={Vault}
          title="Your Vault is Empty"
          description="Generate your first secure password and save it here."
          action={
            <Button asChild variant="brand" size="lg">
              <Link to="/app/generate">Generate Password</Link>
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No passwords found"
          description="Try searching with a different website or username."
          action={
            <Button variant="outline" onClick={() => setQuery("")}>
              Clear Search
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((entry) => (
            <PasswordCard
              key={entry.id}
              entry={entry}
              onEdit={(item) => {
                setEditing(item);
                setDialogOpen(true);
              }}
              onDelete={setDeleting}
            />
          ))}
        </div>
      )}

      <PasswordDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
        entry={editing}
        onSubmit={handleSubmit}
      />

      <ConfirmDeleteDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}