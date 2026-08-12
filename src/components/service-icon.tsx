import {
  Github,
  GraduationCap,
  Instagram,
  Mail,
  MonitorPlay,
  ShoppingCart,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<string, typeof Globe> = {
  gmail: Mail,
  mail: Mail,
  github: Github,
  instagram: Instagram,
  netflix: MonitorPlay,
  amazon: ShoppingCart,
  college: GraduationCap,
  school: GraduationCap,
};

export function ServiceIcon({
  service,
  className,
}: {
  service: string;
  className?: string;
}) {
  const key = Object.keys(ICONS).find((k) => service.toLowerCase().includes(k));
  const Icon = (key ? ICONS[key] : undefined) ?? Globe;
  return (
    <span
      className={cn(
        "grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground",
        className,
      )}
      aria-hidden="true"
    >
      <Icon className="size-5" />
    </span>
  );
}