/**
 * app/dashboard/closing/page.tsx
 * Friday financial closing page — admin only.
 * Shows weekly closing records per store, allows marking as Paid.
 */

"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth/context";
import { createBrowserClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { useToast } from "@/hooks/use-toast";
import RoleGuard from "@/components/shared/RoleGuard";
import StatusBadge from "@/components/shared/StatusBadge";
import { TableSkeleton } from "@/components/shared/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Calculator, CheckCircle2, RefreshCw, Trash2 } from "lucide-react";

// Get the next Friday (or current day if Friday) as ISO date string
function getNextFriday(): string {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 5=Fri
  const diff = day === 5 ? 0 : (5 - day + 7) % 7;
  const friday = new Date(now);
  friday.setDate(now.getDate() + diff);
  return friday.toISOString().slice(0, 10);
}

export default function ClosingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const supabase = createBrowserClient();

  const [weekRef, setWeekRef] = useState(getNextFriday());
  const [closings, setClosings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch closings for selected week
  const fetchClosings = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("weekly_closing")
      .select("*")
      .eq("week_reference", weekRef)
      .order("payment_status", { ascending: true })
      .order("created_at", { ascending: false });
    setClosings(data ?? []);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchClosings();
  }, [weekRef]);

  // Generate closing for selected week (admin only)
  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.rpc("rpc_generate_weekly_closing", {
        p_week_reference: weekRef,
      });
      if (error) throw error;
      toast({
        title: "Fechamento gerado!",
        description: `${data} registro(s) criado(s) para ${new Date(weekRef).toLocaleDateString("pt-BR")}.`,
      });
      fetchClosings();
    } catch (err: any) {
      toast({ title: "Erro ao gerar fechamento", description: err.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  // Mark a closing as paid
  const handleMarkPaid = async (id: string) => {
    setPayingId(id);
    const { data: closing, error } = await supabase
      .from("weekly_closing")
      .update({ payment_status: "paid", paid_at: new Date().toISOString() })
      .eq("id", id)
      .select("consignment_id")
      .single();

    if (error) {
      toast({ title: "Erro ao marcar pagamento", variant: "destructive" });
    } else {
      if (closing?.consignment_id) {
        await supabase
          .from("consignments")
          .update({ status: "closed" })
          .eq("id", closing.consignment_id);
      }
      toast({ title: "Pagamento registrado!", description: "Status atualizado para Pago." });
      fetchClosings();
    }
    setPayingId(null);
  };

  const handleDeleteClosing = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este fechamento semanal? A consignação correspondente será reaberta.")) {
      return;
    }
    setDeletingId(id);
    const { data: closing } = await supabase
      .from("weekly_closing")
      .select("consignment_id")
      .eq("id", id)
      .single();

    const { error } = await supabase
      .from("weekly_closing")
      .delete()
      .eq("id", id);

    if (error) {
      toast({ title: "Erro ao excluir fechamento", variant: "destructive" });
    } else {
      if (closing?.consignment_id) {
        await supabase
          .from("consignments")
          .update({ status: "open" })
          .eq("id", closing.consignment_id);
      }
      toast({ title: "Fechamento excluído!", description: "Consignação reaberta com sucesso." });
      fetchClosings();
    }
    setDeletingId(null);
  };

  const totalPending = closings.filter((c) => c.payment_status === "pending")
    .reduce((s, c) => s + c.amount_due, 0);
  const totalPaid = closings.filter((c) => c.payment_status === "paid")
    .reduce((s, c) => s + c.amount_due, 0);

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Fechamento Semanal</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Controle de pagamentos dos lojistas por semana.
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5">
            <Label className="text-zinc-300 text-sm">Semana (sexta-feira de referência)</Label>
            <Input
              type="date"
              value={weekRef}
              onChange={(e) => setWeekRef(e.target.value)}
              className="bg-[#1a1a1a] border-[#2a2a2a] text-white w-48"
            />
          </div>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="bg-aksel-600 hover:bg-aksel-700 text-white font-semibold gap-2"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Calculator className="h-4 w-4" />
            )}
            Gerar Fechamento
          </Button>
          <Button variant="ghost" size="icon" onClick={fetchClosings} className="text-zinc-400 hover:text-white">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Summary */}
        {closings.length > 0 && (
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <div className="bg-[#141414] border border-[#2a2a2a] rounded-lg p-4">
              <p className="text-xs text-zinc-500 mb-1">A Receber</p>
              <p className="text-2xl font-bold text-yellow-400 tabular-nums">{formatCurrency(totalPending)}</p>
            </div>
            <div className="bg-[#141414] border border-[#2a2a2a] rounded-lg p-4">
              <p className="text-xs text-zinc-500 mb-1">Recebido</p>
              <p className="text-2xl font-bold text-green-400 tabular-nums">{formatCurrency(totalPaid)}</p>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="rounded-lg border border-[#2a2a2a] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2a2a2a] bg-[#141414]">
                  {["Lojista", "Valor Devido", "Status", "Pago em", "Ação"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <TableSkeleton rows={4} cols={5} />
                ) : closings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center">
                      <Calculator className="h-8 w-8 text-zinc-700 mx-auto mb-3" />
                      <p className="text-sm text-zinc-500">
                        Nenhum fechamento para esta semana.
                        <br />
                        Clique em "Gerar Fechamento" para calcular.
                      </p>
                    </td>
                  </tr>
                ) : (
                  closings.map((c) => (
                    <tr key={c.id}
                      className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a] transition-colors">
                      <td className="px-4 py-3 font-medium text-white">{c.store_name}</td>
                      <td className="px-4 py-3 font-semibold tabular-nums text-white">
                        {formatCurrency(c.amount_due)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={c.payment_status} />
                      </td>
                      <td className="px-4 py-3 text-zinc-500 text-xs">
                        {c.paid_at
                          ? new Date(c.paid_at).toLocaleDateString("pt-BR")
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {c.payment_status === "pending" && (
                            <Button
                              size="sm"
                              onClick={() => handleMarkPaid(c.id)}
                              disabled={payingId === c.id}
                              className="bg-green-700 hover:bg-green-600 text-white h-8 text-xs gap-1.5"
                            >
                              {payingId === c.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-3 w-3" />
                              )}
                              Marcar Pago
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteClosing(c.id)}
                            disabled={deletingId === c.id}
                            className="text-zinc-400 hover:text-red-400 hover:bg-red-500/10 h-8 w-8 p-0"
                          >
                            {deletingId === c.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
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
