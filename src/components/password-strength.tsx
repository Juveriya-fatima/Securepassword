import { scorePassword, strengthFromScore, type Strength } from "@/lib/password";
import { cn } from "@/lib/utils";

const TONE = {
  0: { bar: "bg-destructive", text: "text-destructive", dot: "bg-destructive" },
  1: { bar: "bg-destructive", text: "text-destructive", dot: "bg-destructive" },
  2: { bar: "bg-warning", text: "text-warning", dot: "bg-warning" },
  3: { bar: "bg-success", text: "text-success", dot: "bg-success" },
  4: { bar: "bg-success", text: "text-success", dot: "bg-success" },
} as const;

function resolveStrength(props: { password?: string; score?: number }): Strength {
  if (props.score !== undefined) return strengthFromScore(props.score);
  return scorePassword(props.password ?? "");
}

export function PasswordStrength({
  password,
  score,
  showLabel = true,
  className,
}: {
  password?: string;
  score?: number;
  showLabel?: boolean;
  className?: string;
}) {
  const { score: s, label, percent } = resolveStrength({ password, score });
  const tone = TONE[s as 0 | 1 | 2 | 3 | 4];
  const hasValue = password !== undefined ? Boolean(password) : score !== undefined;

  return (
    <div className={cn("space-y-2", className)}>
      {showLabel && (
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-muted-foreground">Password Strength</span>
          <span className={cn("inline-flex items-center gap-1.5 font-semibold", tone.text)}>
            <span className={cn("size-2 rounded-full", tone.dot)} aria-hidden="true" />
            {label}
          </span>
        </div>
      )}
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-secondary"
        role="progressbar"
        aria-label="Password strength"
        aria-valuenow={s}
        aria-valuemin={0}
        aria-valuemax={4}
        aria-valuetext={label}
      >
        <div
          className={cn("h-full rounded-full transition-all duration-500 ease-out", tone.bar)}
          style={{ width: `${hasValue ? percent : 0}%` }}
        />
      </div>
    </div>
  );
}

export function StrengthBadge({ password, score }: { password?: string; score?: number }) {
  const { score: s, label } = resolveStrength({ password, score });
  const tone = TONE[s as 0 | 1 | 2 | 3 | 4];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold",
        tone.text,
      )}
    >
      <span className={cn("size-2 rounded-full", tone.dot)} aria-hidden="true" />
      {label}
    </span>
  );
}
