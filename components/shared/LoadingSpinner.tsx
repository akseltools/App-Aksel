/**
 * components/shared/LoadingSpinner.tsx
 * Reusable loading spinner with accessible label.
 */

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  /** Accessible label for screen readers */
  label?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const SIZE_MAP = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-10 w-10",
};

export default function LoadingSpinner({
  label = "Carregando...",
  className,
  size = "md",
}: LoadingSpinnerProps) {
  return (
    <div
      role="status"
      aria-label={label}
      className={cn("flex items-center justify-center", className)}
    >
      <Loader2 className={cn("animate-spin text-aksel-500", SIZE_MAP[size])} />
      <span className="sr-only">{label}</span>
    </div>
  );
}

/** Full-page centered spinner */
export function PageSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <LoadingSpinner size="lg" label="Carregando página..." />
    </div>
  );
}

/** Table skeleton row */
export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-[#1f1f1f]">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-4 bg-[#1f1f1f] rounded animate-pulse w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
