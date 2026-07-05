/**
 * components/shared/RoleGuard.tsx
 * Client component that hides children if the user's role doesn't match.
 * Shows a 403 message for unauthorized access attempts.
 *
 * Usage:
 *   <RoleGuard allowedRoles={['admin']}>
 *     <AdminOnlyContent />
 *   </RoleGuard>
 */

"use client";

import { useAuth } from "@/lib/auth/context";
import { ShieldOff } from "lucide-react";

interface RoleGuardProps {
  /** Roles allowed to see the children. */
  allowedRoles: ("admin" | "representative")[];
  /** Content to render if authorized. */
  children: React.ReactNode;
  /**
   * If true, renders null (completely hides) instead of the 403 message.
   * Use for hiding buttons/elements — not for protecting full pages.
   */
  silent?: boolean;
}

export default function RoleGuard({
  allowedRoles,
  children,
  silent = false,
}: RoleGuardProps) {
  const { user, isLoading } = useAuth();

  // While session loads, render nothing to avoid flash
  if (isLoading) return null;

  // Authorized: show content
  if (user && allowedRoles.includes(user.role)) {
    return <>{children}</>;
  }

  // Silent mode: just hide (for buttons/elements)
  if (silent) return null;

  // Full page 403 message
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center">
      <div className="w-16 h-16 rounded-full bg-aksel-950 border border-aksel-800 flex items-center justify-center">
        <ShieldOff className="h-7 w-7 text-aksel-500" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-white">Acesso Negado</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Você não tem permissão para acessar esta área.
        </p>
      </div>
    </div>
  );
}
