/**
 * app/dashboard/movements/page.tsx
 * Stock movements page.
 * - Tab 1 (admin): NF stock entry form
 * - Tab 2: Movement history with filters
 */

"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth/context";
import { useInventory } from "@/hooks/useInventory";
import StockEntryForm from "@/components/inventory/StockEntryForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createBrowserClient } from "@/lib/supabase/client";
import { useEffect } from "react";
import type { StockMovementRow } from "@/lib/supabase/types";
import { TableSkeleton } from "@/components/shared/LoadingSpinner";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

const movementLabel: Record<string, string> = {
  entry: "Entrada NF",
  exit_sale: "Venda",
  exit_consignment: "Consignação",
  return: "Retorno",
};

function MovementHistory() {
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createBrowserClient();

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from("stock_movements")
        .select("*, products(name), users(full_name, username)")
        .order("created_at", { ascending: false })
        .limit(50);
      setMovements(data ?? []);
      setLoading(false);
    }
    fetch();
  }, []);

  return (
    <div className="rounded-lg border border-[#2a2a2a] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a2a2a] bg-[#141414]">
              {["Tipo", "Produto", "Qtd.", "Usuário", "Observação", "Data"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableSkeleton rows={8} cols={6} />
            ) : movements.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-zinc-600">
                  Nenhuma movimentação registrada.
                </td>
              </tr>
            ) : (
              movements.map((mov) => {
                const isEntry = mov.movement_type === "entry" || mov.movement_type === "return";
                return (
                  <tr key={mov.id} className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a] transition-colors">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full
                        ${isEntry ? "bg-green-950/60 text-green-400" : "bg-aksel-950/60 text-aksel-400"}`}>
                        {isEntry ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                        {movementLabel[mov.movement_type] ?? mov.movement_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white font-medium">{mov.products?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-zinc-300 tabular-nums">
                      <span className={isEntry ? "text-green-400" : "text-aksel-400"}>
                        {isEntry ? "+" : "-"}{mov.quantity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{mov.users?.full_name ?? mov.users?.username ?? "—"}</td>
                    <td className="px-4 py-3 text-zinc-500 text-xs max-w-[200px] truncate">{mov.notes ?? "—"}</td>
                    <td className="px-4 py-3 text-zinc-500 text-xs whitespace-nowrap">
                      {new Date(mov.created_at).toLocaleString("pt-BR", {
                        day: "2-digit", month: "2-digit", year: "2-digit",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function MovementsPage() {
  const { isAdmin } = useAuth();
  const { products } = useInventory();

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Movimentações</h1>
        <p className="text-sm text-zinc-500 mt-1">Entradas e saídas de estoque.</p>
      </div>

      <Tabs defaultValue={isAdmin ? "entry" : "history"}>
        <TabsList className="bg-[#141414] border border-[#2a2a2a]">
          {isAdmin && (
            <TabsTrigger
              value="entry"
              className="data-[state=active]:bg-aksel-600 data-[state=active]:text-white text-zinc-400"
            >
              Entrada de NF
            </TabsTrigger>
          )}
          <TabsTrigger
            value="history"
            className="data-[state=active]:bg-aksel-600 data-[state=active]:text-white text-zinc-400"
          >
            Histórico
          </TabsTrigger>
        </TabsList>

        {isAdmin && (
          <TabsContent value="entry">
            <div className="bg-[#141414] border border-[#2a2a2a] rounded-lg p-6 max-w-lg mt-4">
              <h2 className="text-base font-semibold text-white mb-4">Registrar Entrada por Nota Fiscal</h2>
              <StockEntryForm products={products} />
            </div>
          </TabsContent>
        )}

        <TabsContent value="history" className="mt-4">
          <MovementHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
