/**
 * components/shared/StatusBadge.tsx
 * Reusable payment status badge — Pendente (yellow) or Pago (green).
 */

import { cn } from "@/lib/utils";
import { Clock, CheckCircle2 } from "lucide-react";

interface StatusBadgeProps {
  status: "pending" | "paid";
  className?: string;
}

/** Maps status to display config */
const STATUS_CONFIG = {
  pending: {
    label: "Pendente",
    icon: Clock,
    className:
      "bg-yellow-950/60 text-yellow-400 border-yellow-800/50",
  },
  paid: {
    label: "Pago",
    icon: CheckCircle2,
    className: "bg-green-950/60 text-green-400 border-green-800/50",
  },
} as const;

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border",
        config.className,
        className
      )}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      {config.label}
    </span>
  );
}
