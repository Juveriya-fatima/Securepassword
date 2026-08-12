import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, ApiClientError } from "@/lib/api-client";
import { decryptBytes } from "@/lib/crypto/aes";
import {
  DEFAULT_KDF_PARAMS,
  deriveAuthKey,
  deriveMasterKeyBits,
  generateKdfSalt,
  importAesKey,
} from "@/lib/crypto/kdf";
import {
  deriveRecoveryVerifier,
  importVaultKey,
  rewrapVaultKeyForNewPassword,
  rewrapVaultKeyWithNewRecoveryKey,
  setupNewAccountCrypto,
  unlockWithPassword,
  unlockWithRecoveryKey,
} from "@/lib/crypto/vault-key";

export type AuthUser = { id: string; name: string; email: string };

type Status = "loading" | "unauthenticated" | "locked" | "unlocked";

type KdfMaterial = {
  kdfSalt: string;
  kdfIterations: number;
  kdfMemoryKib: number;
  kdfParallelism: number;
};

type AuthContextValue = {
  status: Status;
  user: AuthUser | null;
  /** In-memory only. Never written to localStorage/sessionStorage/cookies/logs. */
  vaultKey: CryptoKey | null;
  register: (name: string, email: string, password: string) => Promise<{ recoveryKey: string }>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Re-derive VK after a page refresh: session cookie is still valid, VK just isn't in memory. */
  unlock: (password: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  recoveryBegin: (email: string) => Promise<{ found: boolean }>;
  recoveryComplete: (
    email: string,
    recoveryKey: string,
    newPassword: string,
  ) => Promise<{ newRecoveryKey: string }>;
  refreshUser: (user: AuthUser) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [vaultKey, setVaultKey] = useState<CryptoKey | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ user: AuthUser }>("/api/auth/me")
      .then((res) => {
        if (cancelled) return;
        setUser(res.user);
        // Authenticated (cookie valid) but VK was never persisted anywhere,
        // so every fresh page load starts locked until the user re-enters
        // their password. This is intentional — see README security notes.
        setStatus("locked");
      })
      .catch(() => {
        if (!cancelled) setStatus("unauthenticated");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const kdfSalt = generateKdfSalt();
    const crypto_ = await setupNewAccountCrypto(password, kdfSalt, DEFAULT_KDF_PARAMS);

    const res = await api.post<{ id: string; name: string; email: string }>(
      "/api/auth/register",
      {
        name,
        email,
        kdfSalt: crypto_.kdfSalt,
        authKey: crypto_.authKey,
        vaultKeyWrapped: crypto_.vaultKeyWrapped,
        vaultKeyWrapIv: crypto_.vaultKeyWrapIv,
        recoveryKeyWrapped: crypto_.recoveryKeyWrapped,
        recoveryKeyWrapIv: crypto_.recoveryKeyWrapIv,
        recoveryKeyVerifier: crypto_.recoveryKeyVerifier,
      },
    );

    const vk = await importVaultKey(crypto_.vaultKeyRaw);
    setUser({ id: res.id, name: res.name, email: res.email });
    setVaultKey(vk);
    setStatus("unlocked");

    return { recoveryKey: crypto_.recoveryKeyToShowUser };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const prelogin = await api.post<KdfMaterial>("/api/auth/prelogin", { email });
    const masterKeyBits = await deriveMasterKeyBits(password, prelogin);
    const authKey = await deriveAuthKey(masterKeyBits);

    let res: { user: AuthUser; vaultKeyWrapped: string; vaultKeyWrapIv: string };
    try {
      res = await api.post("/api/auth/login", { email, authKey });
    } catch (err) {
      if (err instanceof ApiClientError) throw err;
      throw new Error("Login failed.");
    }

    let vaultKeyRaw: Uint8Array;
    try {
      const masterAesKey = await importAesKey(masterKeyBits);
      vaultKeyRaw = await decryptBytes(
        { ciphertext: res.vaultKeyWrapped, iv: res.vaultKeyWrapIv },
        masterAesKey,
      );
    } catch {
      throw new Error("Could not unlock your vault. Please try again.");
    }

    const vk = await importVaultKey(vaultKeyRaw);
    setUser(res.user);
    setVaultKey(vk);
    setStatus("unlocked");
  }, []);

  const unlock = useCallback(
    async (password: string) => {
      if (!user) throw new Error("Not signed in.");
      const material = await api.get<
        KdfMaterial & { vaultKeyWrapped: string; vaultKeyWrapIv: string }
      >("/api/auth/vault-key-material");

      try {
        const { vaultKeyRaw } = await unlockWithPassword(password, material, {
          ciphertext: material.vaultKeyWrapped,
          iv: material.vaultKeyWrapIv,
        });
        const vk = await importVaultKey(vaultKeyRaw);
        setVaultKey(vk);
        setStatus("unlocked");
      } catch {
        throw new Error("Incorrect password.");
      }
    },
    [user],
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/api/auth/logout");
    } finally {
      setUser(null);
      setVaultKey(null);
      setStatus("unauthenticated");
    }
  }, []);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      if (!vaultKey || !user) throw new Error("Vault is locked.");

      const material = await api.get<KdfMaterial>("/api/auth/vault-key-material");
      const currentMasterKeyBits = await deriveMasterKeyBits(currentPassword, material);
      const currentAuthKey = await deriveAuthKey(currentMasterKeyBits);

      const rawVk = new Uint8Array(await crypto.subtle.exportKey("raw", vaultKey));
      const newSalt = generateKdfSalt();
      const rewrap = await rewrapVaultKeyForNewPassword(
        rawVk,
        newPassword,
        newSalt,
        DEFAULT_KDF_PARAMS,
      );

      await api.post("/api/auth/change-password", { currentAuthKey, ...rewrap });
    },
    [vaultKey, user],
  );

  const recoveryBegin = useCallback(async (email: string) => {
    return api.post<{ found: boolean }>("/api/auth/recovery-begin", { email });
  }, []);

  const recoveryComplete = useCallback(
    async (email: string, recoveryKey: string, newPassword: string) => {
      const begin = await api.post<{
        found: boolean;
        recoveryKeyWrapped?: string;
        recoveryKeyWrapIv?: string;
      }>("/api/auth/recovery-begin", { email });

      if (!begin.found || !begin.recoveryKeyWrapped || !begin.recoveryKeyWrapIv) {
        throw new Error("Recovery could not be completed.");
      }

      let vaultKeyRaw: Uint8Array;
      try {
        vaultKeyRaw = await unlockWithRecoveryKey(recoveryKey, {
          ciphertext: begin.recoveryKeyWrapped,
          iv: begin.recoveryKeyWrapIv,
        });
      } catch {
        throw new Error("That recovery key doesn't match this account.");
      }

      const recoveryKeyVerifier = await deriveRecoveryVerifier(recoveryKey);

      const newKdfSalt = generateKdfSalt();
      const passwordRewrap = await rewrapVaultKeyForNewPassword(
        vaultKeyRaw,
        newPassword,
        newKdfSalt,
        DEFAULT_KDF_PARAMS,
      );
      const recoveryRewrap = await rewrapVaultKeyWithNewRecoveryKey(vaultKeyRaw);

      await api.post("/api/auth/recovery-complete", {
        email,
        recoveryKeyVerifier,
        newKdfSalt: passwordRewrap.newKdfSalt,
        newAuthKey: passwordRewrap.newAuthKey,
        newVaultKeyWrapped: passwordRewrap.newVaultKeyWrapped,
        newVaultKeyWrapIv: passwordRewrap.newVaultKeyWrapIv,
        newRecoveryKeyWrapped: recoveryRewrap.newRecoveryKeyWrapped,
        newRecoveryKeyWrapIv: recoveryRewrap.newRecoveryKeyWrapIv,
        newRecoveryKeyVerifier: recoveryRewrap.newRecoveryKeyVerifier,
      });

      setStatus("unauthenticated");
      setUser(null);
      setVaultKey(null);

      return { newRecoveryKey: recoveryRewrap.recoveryKeyToShowUser };
    },
    [],
  );

  const refreshUser = useCallback((next: AuthUser) => setUser(next), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      vaultKey,
      register,
      login,
      logout,
      unlock,
      changePassword,
      recoveryBegin,
      recoveryComplete,
      refreshUser,
    }),
    [
      status,
      user,
      vaultKey,
      register,
      login,
      logout,
      unlock,
      changePassword,
      recoveryBegin,
      recoveryComplete,
      refreshUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
