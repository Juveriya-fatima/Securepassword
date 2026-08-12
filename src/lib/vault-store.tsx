import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/auth/auth-context";
import { decryptString, encryptString } from "@/lib/crypto/aes";
import { scorePassword } from "@/lib/password";

export type VaultEntry = {
  id: string;
  service: string;
  username: string;
  strengthScore: number;
  createdAt: string;
  updatedAt: string;
  encryptedPassword: string;
  encryptionIv: string;
};

export type VaultDraft = { service: string; username: string; password: string };

type VaultEntryDto = {
  id: string;
  service: string;
  username: string;
  encryptedPassword: string;
  encryptionIv: string;
  encryptionVersion: number;
  strengthScore: number;
  createdAt: string;
  updatedAt: string;
};

function toEntry(dto: VaultEntryDto): VaultEntry {
  return {
    id: dto.id,
    service: dto.service,
    username: dto.username,
    strengthScore: dto.strengthScore,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    encryptedPassword: dto.encryptedPassword,
    encryptionIv: dto.encryptionIv,
  };
}

type VaultContextValue = {
  entries: VaultEntry[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addEntry: (draft: VaultDraft) => Promise<void>;
  updateEntry: (id: string, draft: VaultDraft) => Promise<void>;
  removeEntry: (id: string) => Promise<void>;
  /** Decrypts a single entry's password on demand. Nothing is decrypted until this is called. */
  decryptEntryPassword: (entry: VaultEntry) => Promise<string>;
  stats: { total: number; strong: number; weak: number };
};

const VaultContext = createContext<VaultContextValue | null>(null);

export function VaultProvider({ children }: { children: ReactNode }) {
  const { vaultKey } = useAuth();
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // The server returns only ciphertext + metadata here — nothing is
      // decrypted just by loading the vault list.
      const res = await api.get<{ entries: VaultEntryDto[] }>("/api/vault");
      setEntries(res.entries.map(toEntry));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your vault.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (vaultKey) void refresh();
  }, [vaultKey, refresh]);

  const addEntry = useCallback(
    async (draft: VaultDraft) => {
      if (!vaultKey) throw new Error("Vault is locked.");
      const { ciphertext, iv } = await encryptString(draft.password, vaultKey);
      const strengthScore = scorePassword(draft.password).score;
      const res = await api.post<{ entry: VaultEntryDto }>("/api/vault", {
        service: draft.service,
        username: draft.username,
        encryptedPassword: ciphertext,
        encryptionIv: iv,
        strengthScore,
      });
      setEntries((prev) => [toEntry(res.entry), ...prev]);
    },
    [vaultKey],
  );

  const updateEntry = useCallback(
    async (id: string, draft: VaultDraft) => {
      if (!vaultKey) throw new Error("Vault is locked.");
      const { ciphertext, iv } = await encryptString(draft.password, vaultKey);
      const strengthScore = scorePassword(draft.password).score;
      const res = await api.patch<{ entry: VaultEntryDto }>(`/api/vault/${id}`, {
        service: draft.service,
        username: draft.username,
        encryptedPassword: ciphertext,
        encryptionIv: iv,
        strengthScore,
      });
      setEntries((prev) => prev.map((item) => (item.id === id ? toEntry(res.entry) : item)));
    },
    [vaultKey],
  );

  const removeEntry = useCallback(async (id: string) => {
    await api.delete(`/api/vault/${id}`);
    setEntries((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const decryptEntryPassword = useCallback(
    async (entry: VaultEntry) => {
      if (!vaultKey) throw new Error("Vault is locked.");
      return decryptString(
        { ciphertext: entry.encryptedPassword, iv: entry.encryptionIv },
        vaultKey,
      );
    },
    [vaultKey],
  );

  const stats = useMemo(() => {
    const strong = entries.filter((e) => e.strengthScore >= 3).length;
    return { total: entries.length, strong, weak: entries.length - strong };
  }, [entries]);

  const value = useMemo<VaultContextValue>(
    () => ({
      entries,
      loading,
      error,
      refresh,
      addEntry,
      updateEntry,
      removeEntry,
      decryptEntryPassword,
      stats,
    }),
    [entries, loading, error, refresh, addEntry, updateEntry, removeEntry, decryptEntryPassword, stats],
  );

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

export function useVault() {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error("useVault must be used inside VaultProvider");
  return ctx;
}
