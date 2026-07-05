/**
 * app/login/page.tsx
 * Redesigned Login page — Dropdown selection of active users grouped by role + 6-digit PIN.
 * On success → redirects to /dashboard.
 */

"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { loginAction } from "@/lib/auth/actions";
import { useAuth } from "@/lib/auth/context";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";
import type { UserRow } from "@/lib/supabase/types";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function LoginPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const { toast } = useToast();

  // ─── State ──────────────────────────────────────────────────────────────────
  const [users, setUsers] = useState<UserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [selectedUsername, setSelectedUsername] = useState<string>("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pinInputRef = useRef<HTMLInputElement>(null);

  // ─── Fetch Active Users ──────────────────────────────────────────────────────
  useEffect(() => {
    async function loadUsers() {
      try {
        console.log("NEXT_PUBLIC_SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
        console.log("NEXT_PUBLIC_SUPABASE_ANON_KEY:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
        const supabase = createBrowserClient();
        const { data, error: dbErr } = await supabase
          .from("users")
          .select("*")
          .eq("is_active", true)
          .order("role", { ascending: true })
          .order("full_name", { ascending: true });

        if (dbErr) throw dbErr;
        setUsers(data ?? []);
      } catch (err: any) {
        console.error("[LoginPage] Failed to load users:", err);
        setError(`Erro: ${err.message || err.details || JSON.stringify(err)}`);
      } finally {
        setUsersLoading(false);
      }
    }
    loadUsers();
  }, []);

  // ─── PIN input: only allow digits, max 6 chars ────────────────────────────
  const handlePinChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value.replace(/\D/g, "").slice(0, 6);
      setPin(val);
      setError(null);
    },
    []
  );

  // ─── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      if (!selectedUsername) {
        setError("Selecione seu nome para continuar.");
        return;
      }
      if (pin.length !== 6) {
        setError("PIN deve ter exatamente 6 dígitos.");
        pinInputRef.current?.focus();
        return;
      }

      setIsLoading(true);
      try {
        const result = await loginAction(selectedUsername, pin);

        if (!result.success) {
          setError(result.error ?? "PIN incorreto.");
          setPin("");
          pinInputRef.current?.focus();
          return;
        }

        // Refresh context with new session data
        await refreshUser();

        const loggedUser = users.find((u) => u.username === selectedUsername);
        toast({
          title: `Bem-vindo, ${loggedUser?.full_name ?? loggedUser?.username}!`,
          description: "Login realizado com sucesso.",
        });

        router.push("/dashboard");
        router.refresh();
      } catch {
        setError("Erro de conexão. Verifique sua internet ou chaves .env.");
      } finally {
        setIsLoading(false);
      }
    },
    [selectedUsername, pin, refreshUser, router, toast, users]
  );

  // Group users by role
  const admins = users.filter((u) => u.role === "admin");
  const reps = users.filter((u) => u.role === "representative");

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      {/* Background texture / gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-aksel-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-aksel-800/10 rounded-full blur-3xl" />
      </div>

      {/* Login card */}
      <div className="relative w-full max-w-sm animate-fade-in">
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-8 shadow-2xl">

          {/* Logo */}
          <div className="flex justify-center mb-8">
            <Image
              src="/logo.png"
              alt="Aksel Tools"
              width={220}
              height={70}
              priority
              className="object-contain"
            />
          </div>

          {/* Title styled with left red bar */}
          <div className="mb-6 pl-3 border-l-4 border-aksel-600">
            <h1 className="text-lg font-black text-white uppercase tracking-wider">
              IDENTIFICAÇÃO
            </h1>
            <p className="text-xs text-zinc-500 mt-1">
              Selecione seu nome e informe seu PIN para acessar
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-5">

            {/* Select User Dropdown */}
            <div className="space-y-1.5">
              <Label className="text-zinc-300 text-sm font-medium">
                Seu nome <span className="text-aksel-500">*</span>
              </Label>
              <Select
                value={selectedUsername}
                onValueChange={(val) => {
                  setSelectedUsername(val);
                  setError(null);
                }}
                disabled={usersLoading || isLoading}
              >
                <SelectTrigger className="bg-[#1f1f1f] border-[#2a2a2a] text-white h-11">
                  <SelectValue placeholder={usersLoading ? "Carregando usuários..." : "Selecione seu nome..."} />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white max-h-64">
                  {admins.length > 0 && (
                    <SelectGroup>
                      <SelectLabel className="text-aksel-500 text-xs font-bold uppercase tracking-wider px-2 py-1.5">
                        PROPRIETÁRIO
                      </SelectLabel>
                      {admins.map((u) => (
                        <SelectItem key={u.id} value={u.username} className="text-white focus:bg-[#2a2a2a]">
                          {u.full_name ?? u.username}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}

                  {reps.length > 0 && (
                    <SelectGroup>
                      <SelectLabel className="text-zinc-500 text-xs font-bold uppercase tracking-wider px-2 py-1.5 border-t border-[#2a2a2a] mt-1 pt-2">
                        REPRESENTANTES
                      </SelectLabel>
                      {reps.map((u) => (
                        <SelectItem key={u.id} value={u.username} className="text-white focus:bg-[#2a2a2a]">
                          {u.full_name ?? u.username}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* PIN */}
            <div className="space-y-1.5">
              <Label htmlFor="pin" className="text-zinc-300 text-sm font-medium">
                PIN (6 dígitos)
              </Label>
              <div className="relative">
                <Input
                  id="pin"
                  ref={pinInputRef}
                  type={showPin ? "text" : "password"}
                  autoComplete="current-password"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  value={pin}
                  onChange={handlePinChange}
                  placeholder="••••••"
                  disabled={isLoading || usersLoading}
                  className="bg-[#1f1f1f] border-[#2a2a2a] text-white placeholder:text-zinc-600
                             focus:border-aksel-600 focus:ring-aksel-600/30 h-11 pr-10
                             tracking-[0.5em] text-center text-lg font-mono"
                />
                {/* Toggle PIN visibility */}
                <button
                  type="button"
                  onClick={() => setShowPin((v) => !v)}
                  aria-label={showPin ? "Ocultar PIN" : "Mostrar PIN"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500
                             hover:text-zinc-300 transition-colors duration-150"
                >
                  {showPin ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div
                role="alert"
                className="flex items-center gap-2 text-sm text-aksel-400 bg-aksel-950/50
                           border border-aksel-800/50 rounded-md px-3 py-2"
              >
                <span className="shrink-0 h-4 w-4 rounded-full bg-aksel-600/20 flex items-center justify-center text-xs">
                  !
                </span>
                <span className="flex-1">{error}</span>
              </div>
            )}

            {/* Submit button */}
            <Button
              type="submit"
              disabled={isLoading || usersLoading || !selectedUsername}
              className="w-full h-11 bg-aksel-600 hover:bg-aksel-700 text-white font-semibold
                         transition-all duration-200 hover:-translate-y-0.5 hover:shadow-aksel-sm
                         active:translate-y-0 active:scale-[0.98] disabled:opacity-50
                         disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Entrar
                </>
              )}
            </Button>
          </form>

          {/* Footer */}
          <p className="mt-6 text-center text-xs text-zinc-600">
            Aksel Tools © {new Date().getFullYear()} — Sistema interno
          </p>
        </div>
      </div>
    </main>
  );
}
