// Client-side password generation and strength scoring. Generation uses the
// Web Crypto API's CSPRNG (crypto.getRandomValues) — never Math.random(),
// which is not safe for anything security-sensitive.
export const CHAR_SETS = {
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  numbers: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.?",
} as const;

export type CharSetKey = keyof typeof CHAR_SETS;

export type GeneratorOptions = {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
};

/** Returns a random index in [0, max) using a CSPRNG, without modulo bias. */
function randomIndex(max: number): number {
  const range = 256 - (256 % max);
  const buf = new Uint8Array(1);
  let value: number;
  do {
    crypto.getRandomValues(buf);
    value = buf[0]!;
  } while (value >= range);
  return value % max;
}

function randomChar(pool: string): string {
  return pool[randomIndex(pool.length)]!;
}

/** Fisher-Yates shuffle using the CSPRNG. */
function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

export function generatePassword(options: GeneratorOptions): string {
  const activeKeys = (Object.keys(CHAR_SETS) as CharSetKey[]).filter((key) => options[key]);
  if (activeKeys.length === 0) return "";

  const pool = activeKeys.map((key) => CHAR_SETS[key]).join("");
  const length = Math.max(0, options.length);

  // Guarantee at least one character from every selected category, whenever
  // the requested length is long enough to fit them all.
  const guaranteed =
    length >= activeKeys.length ? activeKeys.map((key) => randomChar(CHAR_SETS[key])) : [];

  const remainingLength = length - guaranteed.length;
  const rest = Array.from({ length: Math.max(0, remainingLength) }, () => randomChar(pool));

  const chars = shuffle([...guaranteed, ...rest]).slice(0, length);
  return chars.join("");
}

export type StrengthLevel = "Weak" | "Fair" | "Strong" | "Very Strong";

export type Strength = {
  score: number; // 0..4
  label: StrengthLevel;
  percent: number;
};

export function scorePassword(password: string): Strength {
  if (!password) return { score: 0, label: "Weak", percent: 0 };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 14) score++;
  const classes = [/[A-Z]/, /[a-z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((re) =>
    re.test(password),
  ).length;
  if (classes >= 3) score++;
  if (classes === 4 && password.length >= 12) score++;
  const labels: StrengthLevel[] = ["Weak", "Weak", "Fair", "Strong", "Very Strong"];
  return {
    score,
    label: labels[score] ?? "Weak",
    percent: Math.max(8, (score / 4) * 100),
  };
}

export function isStrong(password: string) {
  return scorePassword(password).score >= 3;
}

const SCORE_LABELS: StrengthLevel[] = ["Weak", "Weak", "Fair", "Strong", "Very Strong"];

/** Renders strength UI from a previously-computed score, without needing the plaintext. */
export function strengthFromScore(score: number): Strength {
  const clamped = Math.max(0, Math.min(4, score));
  return {
    score: clamped,
    label: SCORE_LABELS[clamped] ?? "Weak",
    percent: Math.max(8, (clamped / 4) * 100),
  };
}

export async function copyToClipboard(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}
