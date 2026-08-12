import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ArrowRight,
  CaseLower,
  CaseUpper,
  Check,
  Copy,
  Eye,
  EyeOff,
  Hash,
  RefreshCw,
  Save,
  Asterisk,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { CharacterOption } from "@/components/generator/character-option";
import { PasswordStrength } from "@/components/password-strength";
import { copyToClipboard, generatePassword, type GeneratorOptions } from "@/lib/password";
import { useVault } from "@/lib/vault-store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const DEFAULTS: GeneratorOptions = {
  length: 16,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
};

export function PasswordGenerator() {
  const { addEntry } = useVault();
  const [options, setOptions] = useState<GeneratorOptions>(DEFAULTS);
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(true);
  const [copied, setCopied] = useState(false);
  const [service, setService] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const noneSelected =
    !options.uppercase && !options.lowercase && !options.numbers && !options.symbols;

  const regenerate = useCallback(() => {
    setPassword(generatePassword(options));
  }, [options]);

  // Initial password, generated client-side with the Web Crypto CSPRNG.
  useEffect(() => {
    setPassword(generatePassword(DEFAULTS));
  }, []);

  const handleGenerate = () => {
    if (noneSelected) {
      toast.error("Select at least one character type");
      return;
    }
    setLoading(true);
    regenerate();
    // Brief, deliberate delay purely so the spinner is perceptible — the
    // generation itself is effectively instant.
    setTimeout(() => setLoading(false), 250);
  };

  const handleCopy = async () => {
    const ok = await copyToClipboard(password);
    if (!ok) {
      toast.error("Couldn't copy — copy it manually instead.");
      return;
    }
    setCopied(true);
    toast.success("Copied!", { description: "Password copied to your clipboard." });
    setTimeout(() => setCopied(false), 1600);
  };

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setTouched(true);
    if (!service.trim() || !username.trim()) {
      toast.error("Add a service and username before saving.");
      return;
    }
    setSaving(true);
    try {
      await addEntry({ service: service.trim(), username: username.trim(), password });
      setSaved(service.trim());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save this password.");
    } finally {
      setSaving(false);
    }
  };

  const setOption = (key: keyof GeneratorOptions, value: boolean | number) =>
    setOptions((prev) => ({ ...prev, [key]: value }));

  const serviceError = touched && !service.trim();
  const usernameError = touched && !username.trim();

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8">
        <h2 className="font-display text-2xl font-bold">Generate a Secure Password</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a strong password for any account.
        </p>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="gen-service">What is this password for?</Label>
            <Input
              id="gen-service"
              value={service}
              onChange={(e) => setService(e.target.value)}
              placeholder="e.g. Gmail, Instagram, GitHub..."
              aria-invalid={serviceError}
              aria-describedby={serviceError ? "gen-service-error" : undefined}
              className={serviceError ? "border-destructive" : undefined}
            />
            {serviceError && (
              <p id="gen-service-error" className="text-xs font-medium text-destructive">
                Tell us what this password is for.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="gen-username">Username / Email</Label>
            <Input
              id="gen-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username or email"
              aria-invalid={usernameError}
              aria-describedby={usernameError ? "gen-username-error" : undefined}
              className={usernameError ? "border-destructive" : undefined}
            />
            {usernameError && (
              <p id="gen-username-error" className="text-xs font-medium text-destructive">
                Add the username or email for this account.
              </p>
            )}
          </div>
        </div>

        {/* Generated password */}
        <div className="mt-6 rounded-2xl border-2 border-primary/25 bg-secondary/40 shadow-card">
          <div className="rounded-2xl p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <p
                className="min-w-0 flex-1 break-all font-mono text-xl font-semibold tracking-tight transition-all duration-300 sm:text-2xl"
                aria-live="polite"
              >
                {password ? (visible ? password : "•".repeat(password.length)) : "—"}
              </p>
              <div className="flex shrink-0 items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setVisible((v) => !v)}
                  aria-label={visible ? "Hide password" : "Show password"}
                >
                  {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCopy}
                  disabled={!password}
                  aria-label="Copy password"
                >
                  {copied ? (
                    <Check className="text-success" aria-hidden="true" />
                  ) : (
                    <Copy aria-hidden="true" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleGenerate}
                  aria-label="Regenerate password"
                >
                  <RefreshCw className={loading ? "animate-spin" : undefined} aria-hidden="true" />
                </Button>
              </div>
            </div>
            <PasswordStrength password={password} className="mt-5" />
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8">
        <h3 className="font-display text-lg font-bold">Password Settings</h3>

        <div className="mt-5">
          <div className="flex items-center justify-between">
            <Label htmlFor="length">Password Length</Label>
            <span className="font-display text-sm font-bold text-primary">
              {options.length} characters
            </span>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <span className="text-xs text-muted-foreground">6</span>
            <Slider
              id="length"
              min={6}
              max={32}
              step={1}
              value={[options.length]}
              onValueChange={([value]) => setOption("length", value ?? 16)}
              aria-label="Password length"
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground">32</span>
          </div>
        </div>

        <fieldset className="mt-7">
          <legend className="text-sm font-semibold">Character Options</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <CharacterOption
              id="opt-upper"
              label="Uppercase Letters"
              hint="A-Z"
              icon={CaseUpper}
              checked={options.uppercase}
              onCheckedChange={(v) => setOption("uppercase", v)}
            />
            <CharacterOption
              id="opt-lower"
              label="Lowercase Letters"
              hint="a-z"
              icon={CaseLower}
              checked={options.lowercase}
              onCheckedChange={(v) => setOption("lowercase", v)}
            />
            <CharacterOption
              id="opt-numbers"
              label="Numbers"
              hint="0-9"
              icon={Hash}
              checked={options.numbers}
              onCheckedChange={(v) => setOption("numbers", v)}
            />
            <CharacterOption
              id="opt-symbols"
              label="Symbols"
              hint="!@#$%"
              icon={Asterisk}
              checked={options.symbols}
              onCheckedChange={(v) => setOption("symbols", v)}
            />
          </div>
          {noneSelected && (
            <p className="mt-3 text-xs font-medium text-destructive">
              Select at least one character type to generate a password.
            </p>
          )}
        </fieldset>

        <div className="mt-8 space-y-3">
          <Button
            variant="brand"
            size="xl"
            className="w-full"
            onClick={handleGenerate}
            disabled={loading || noneSelected}
          >
            <RefreshCw className={loading ? "animate-spin" : undefined} aria-hidden="true" />
            {loading ? "Generating..." : "Generate Password"}
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={handleSave}
            disabled={!password || saving}
          >
            <Save aria-hidden="true" />
            {saving ? "Saving..." : "Save to Vault"}
          </Button>
        </div>
      </div>

      <Dialog open={saved !== null} onOpenChange={(open) => !open && setSaved(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-success/12 text-success">
              <Check className="size-7" aria-hidden="true" />
            </span>
            <DialogTitle className="text-center">Password Saved</DialogTitle>
            <DialogDescription className="text-center">
              {saved} password has been saved to your vault.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button variant="outline" onClick={() => setSaved(null)}>
              Continue Generating
            </Button>
            <Button asChild variant="brand">
              <Link to="/app/vault">
                View Vault
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}