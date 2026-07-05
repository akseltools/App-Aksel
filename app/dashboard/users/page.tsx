/**
 * app/dashboard/users/page.tsx
 * User management page — admin only.
 * Lists all users and allows PIN reset and creating new users.
 */

"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth/context";
import { createBrowserClient } from "@/lib/supabase/client";
import { resetPinAction, createUserAction, toggleUserStatusAction, deleteUserAction, changeUserRoleAction } from "@/lib/auth/actions";
import { useToast } from "@/hooks/use-toast";
import RoleGuard from "@/components/shared/RoleGuard";
import { TableSkeleton } from "@/components/shared/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UserRow } from "@/lib/supabase/types";
import { Users, KeyRound, Plus, Loader2, ShieldCheck, User, UserX, UserCheck, Trash2 } from "lucide-react";

// ─── PIN Reset Dialog ─────────────────────────────────────────────────────────
function PinResetDialog({ targetUser, onSuccess }: { targetUser: UserRow; onSuccess: () => void }) {
  const { toast } = useToast();
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleReset = async () => {
    if (!/^\d{6}$/.test(newPin)) {
      toast({ title: "PIN deve ter 6 dígitos numéricos.", variant: "destructive" });
      return;
    }
    if (newPin !== confirmPin) {
      toast({ title: "PINs não conferem.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    const result = await resetPinAction(targetUser.id, newPin);
    if (result.success) {
      toast({ title: "PIN atualizado!", description: `PIN de ${targetUser.full_name ?? targetUser.username} resetado.` });
      setNewPin("");
      setConfirmPin("");
      setOpen(false);
      onSuccess();
    } else {
      toast({ title: "Erro ao resetar PIN", description: result.error, variant: "destructive" });
    }
    setIsLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm"
          className="h-8 text-xs text-zinc-400 hover:text-white gap-1.5">
          <KeyRound className="h-3 w-3" />
          Resetar PIN
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#141414] border-[#2a2a2a] text-white max-w-sm">
        <DialogHeader>
          <DialogTitle>Resetar PIN — {targetUser.full_name ?? targetUser.username}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-zinc-300 text-sm">Novo PIN (6 dígitos)</Label>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="••••••"
              className="bg-[#1a1a1a] border-[#2a2a2a] text-white tracking-[0.5em] text-center"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-zinc-300 text-sm">Confirmar Novo PIN</Label>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="••••••"
              className="bg-[#1a1a1a] border-[#2a2a2a] text-white tracking-[0.5em] text-center"
            />
          </div>
          <Button onClick={handleReset} disabled={isLoading}
            className="w-full bg-aksel-600 hover:bg-aksel-700 text-white font-semibold">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <KeyRound className="h-4 w-4 mr-2" />}
            Confirmar Reset
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── User Status Toggle Button ────────────────────────────────────────────────
function UserStatusToggleButton({
  targetUser,
  currentUser,
  onSuccess,
}: {
  targetUser: UserRow;
  currentUser: any;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    setIsLoading(true);
    const result = await toggleUserStatusAction(targetUser.id, !targetUser.is_active);
    if (result.success) {
      toast({
        title: targetUser.is_active ? "Usuário desativado!" : "Usuário ativado!",
        description: `${targetUser.full_name ?? targetUser.username} foi ${targetUser.is_active ? "desativado" : "ativado"} com sucesso.`,
      });
      onSuccess();
    } else {
      toast({
        title: "Erro ao alterar status",
        description: result.error,
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const isSelf = currentUser?.id === targetUser.id;

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isLoading || isSelf}
      onClick={handleToggle}
      className={`h-8 text-xs gap-1.5 ${
        targetUser.is_active
          ? "text-zinc-400 hover:text-red-400 hover:bg-red-950/20"
          : "text-zinc-400 hover:text-green-400 hover:bg-green-950/20"
      }`}
      title={isSelf ? "Você não pode desativar a si mesmo" : targetUser.is_active ? "Desativar usuário" : "Ativar usuário"}
    >
      {isLoading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : targetUser.is_active ? (
        <>
          <UserX className="h-3.5 w-3.5 text-red-500" />
          Desativar
        </>
      ) : (
        <>
          <UserCheck className="h-3.5 w-3.5 text-green-500" />
          Ativar
        </>
      )}
    </Button>
  );
}

// ─── Delete User Button with Confirmation ─────────────────────────────────────
function DeleteUserButton({
  targetUser,
  currentUser,
  onSuccess,
}: {
  targetUser: UserRow;
  currentUser: any;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleDelete = async () => {
    setIsLoading(true);
    const result = await deleteUserAction(targetUser.id);
    if (result.success) {
      toast({
        title: "Usuário excluído!",
        description: `${targetUser.full_name ?? targetUser.username} foi removido do sistema permanentemente.`,
      });
      setOpen(false);
      onSuccess();
    } else {
      toast({
        title: "Erro ao excluir",
        description: result.error,
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const isSelf = currentUser?.id === targetUser.id;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={isLoading || isSelf}
          className="h-8 text-xs gap-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-950/20"
          title={isSelf ? "Você não pode excluir a si mesmo" : "Excluir usuário"}
        >
          <Trash2 className="h-3.5 w-3.5 text-red-500" />
          Excluir
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#141414] border-[#2a2a2a] text-white max-w-sm">
        <DialogHeader>
          <DialogTitle>Excluir Usuário</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <p className="text-zinc-400 text-sm">
            Tem certeza que deseja excluir permanentemente o usuário{" "}
            <span className="font-bold text-white">{targetUser.full_name ?? targetUser.username}</span>?
            Esta ação não pode ser desfeita.
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1 border-[#2a2a2a] text-zinc-300 hover:bg-[#2a2a2a]"
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDelete}
              disabled={isLoading}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sim, Excluir"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Change Role Button/Dialog (Admin only) ──────────────────────────────────
function ChangeRoleButton({
  targetUser,
  currentUser,
  onSuccess,
}: {
  targetUser: UserRow;
  currentUser: any;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const newRole = targetUser.role === "admin" ? "representative" : "admin";
  const newRoleLabel = newRole === "admin" ? "Administrador" : "Representante";

  const handleRoleChange = async () => {
    setIsLoading(true);
    const result = await changeUserRoleAction(targetUser.id, newRole);
    if (result.success) {
      toast({
        title: "Perfil alterado!",
        description: `O perfil de ${targetUser.full_name ?? targetUser.username} foi alterado para ${newRoleLabel}.`,
      });
      setOpen(false);
      onSuccess();
    } else {
      toast({
        title: "Erro ao alterar perfil",
        description: result.error,
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const isSelf = currentUser?.id === targetUser.id;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={isLoading || isSelf}
          className="h-8 text-xs gap-1.5 text-zinc-400 hover:text-white"
          title={isSelf ? "Você não pode alterar seu próprio perfil" : `Alterar perfil para ${newRoleLabel}`}
        >
          {targetUser.role === "admin" ? (
            <>
              <User className="h-3.5 w-3.5 text-zinc-400" />
              Tornar Repres.
            </>
          ) : (
            <>
              <ShieldCheck className="h-3.5 w-3.5 text-aksel-400" />
              Tornar Admin
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#141414] border-[#2a2a2a] text-white max-w-sm">
        <DialogHeader>
          <DialogTitle>Alterar Perfil de Usuário</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <p className="text-zinc-400 text-sm">
            Tem certeza que deseja alterar o perfil de{" "}
            <span className="font-bold text-white">{targetUser.full_name ?? targetUser.username}</span> de{" "}
            <span className="font-bold text-zinc-300">{targetUser.role === "admin" ? "Administrador" : "Representante"}</span> para{" "}
            <span className="font-bold text-aksel-400">{newRoleLabel}</span>?
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1 border-[#2a2a2a] text-zinc-300 hover:bg-[#2a2a2a]"
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleRoleChange}
              disabled={isLoading}
              className="flex-1 bg-aksel-600 hover:bg-aksel-700 text-white font-semibold"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Create User Dialog ───────────────────────────────────────────────────────
function CreateUserDialog({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({ username: "", full_name: "", pin: "", role: "representative" as "admin" | "representative" });

  const handleCreate = async () => {
    setIsLoading(true);
    const result = await createUserAction(form);
    if (result.success) {
      toast({ title: "Usuário criado!", description: `${form.full_name} adicionado ao sistema.` });
      setForm({ username: "", full_name: "", pin: "", role: "representative" });
      setOpen(false);
      onSuccess();
    } else {
      toast({ title: "Erro ao criar usuário", description: result.error, variant: "destructive" });
    }
    setIsLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-aksel-600 hover:bg-aksel-700 text-white font-semibold gap-2">
          <Plus className="h-4 w-4" />
          Novo Usuário
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#141414] border-[#2a2a2a] text-white max-w-sm">
        <DialogHeader>
          <DialogTitle>Criar Novo Usuário</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-zinc-300 text-sm">Nome Completo</Label>
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              placeholder="João Silva" className="bg-[#1a1a1a] border-[#2a2a2a] text-white" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-zinc-300 text-sm">Nome de Usuário (login)</Label>
            <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="joao.silva" className="bg-[#1a1a1a] border-[#2a2a2a] text-white" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-zinc-300 text-sm">Perfil</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as any })}>
              <SelectTrigger className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a]">
                <SelectItem value="representative" className="text-white">Representante</SelectItem>
                <SelectItem value="admin" className="text-white">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-zinc-300 text-sm">PIN Inicial (6 dígitos)</Label>
            <Input type="password" inputMode="numeric" maxLength={6}
              value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, "").slice(0, 6) })}
              placeholder="••••••"
              className="bg-[#1a1a1a] border-[#2a2a2a] text-white tracking-[0.5em] text-center" />
          </div>
          <Button onClick={handleCreate} disabled={isLoading}
            className="w-full bg-aksel-600 hover:bg-aksel-700 text-white font-semibold">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            Criar Usuário
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const supabase = createBrowserClient();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsers = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("users")
      .select("*")
      .order("role", { ascending: true })
      .order("full_name", { ascending: true });
    setUsers((data as UserRow[]) ?? []);
    setIsLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Usuários</h1>
            <p className="text-sm text-zinc-500 mt-1">
              Gerencie os usuários e redefina PINs de acesso.
            </p>
          </div>
          <CreateUserDialog onSuccess={fetchUsers} />
        </div>

        {/* Users table */}
        <div className="rounded-lg border border-[#2a2a2a] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2a2a2a] bg-[#141414]">
                  {["Usuário", "Login", "Perfil", "Status", "Criado em", "Ações"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <TableSkeleton rows={4} cols={6} />
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-sm text-zinc-600">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      Nenhum usuário encontrado.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                            ${u.role === "admin" ? "bg-aksel-900 text-aksel-300" : "bg-zinc-800 text-zinc-300"}`}>
                            {(u.full_name ?? u.username).charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-white">{u.full_name ?? "—"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-400 font-mono text-xs">{u.username}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={u.role === "admin"
                          ? "text-aksel-400 border-aksel-800 bg-aksel-950/50 text-xs"
                          : "text-zinc-400 border-zinc-700 bg-zinc-900/50 text-xs"}>
                          {u.role === "admin" ? <><ShieldCheck className="h-3 w-3 mr-1" />Admin</> : <><User className="h-3 w-3 mr-1" />Representante</>}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${u.is_active ? "text-green-400" : "text-zinc-600"}`}>
                          {u.is_active ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-500 text-xs">
                        {new Date(u.created_at).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {u.is_active ? (
                            <>
                              <PinResetDialog targetUser={u} onSuccess={fetchUsers} />
                              <ChangeRoleButton targetUser={u} currentUser={currentUser} onSuccess={fetchUsers} />
                              <UserStatusToggleButton targetUser={u} currentUser={currentUser} onSuccess={fetchUsers} />
                            </>
                          ) : (
                            <>
                              <UserStatusToggleButton targetUser={u} currentUser={currentUser} onSuccess={fetchUsers} />
                              <DeleteUserButton targetUser={u} currentUser={currentUser} onSuccess={fetchUsers} />
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
