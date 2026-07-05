/**
 * components/layout/TopBar.tsx
 * Top navigation bar shown across all dashboard pages.
 * - Displays user name and role badge
 * - Logout button
 */

"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { logoutAction } from "@/lib/auth/actions";
import type { SessionUser } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TopBarProps {
  user: SessionUser;
}

export default function TopBar({ user }: TopBarProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction();
      toast({ title: "Sessão encerrada", description: "Até logo!" });
      router.push("/login");
      router.refresh();
    });
  };

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-[#111111] border-b border-[#1f1f1f] shrink-0">
      {/* Left: empty or breadcrumb placeholder */}
      <div />

      {/* Right: user info + logout */}
      <div className="flex items-center gap-4">
        {/* User info */}
        <div className="flex items-center gap-2.5">
          {/* Avatar circle */}
          <div
            aria-hidden="true"
            className="w-8 h-8 rounded-full bg-aksel-900 border border-aksel-700 flex items-center
                       justify-center text-sm font-semibold text-aksel-300"
          >
            {(user.full_name ?? user.username).charAt(0).toUpperCase()}
          </div>

          {/* Name and role */}
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-white leading-none">
              {user.full_name ?? user.username}
            </p>
            <div className="mt-1">
              <Badge
                variant="outline"
                className={
                  user.role === "admin"
                    ? "text-aksel-400 border-aksel-800 bg-aksel-950/50 text-[10px] px-1.5 py-0"
                    : "text-zinc-400 border-zinc-700 bg-zinc-900/50 text-[10px] px-1.5 py-0"
                }
              >
                {user.role === "admin" ? "Administrador" : "Representante"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-[#2a2a2a]" />

        {/* Logout button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          disabled={isPending}
          aria-label="Sair do sistema"
          className="text-zinc-500 hover:text-white hover:bg-[#1a1a1a] gap-2 min-h-[36px]"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4" />
          )}
          <span className="hidden sm:inline text-sm">Sair</span>
        </Button>
      </div>
    </header>
  );
}
