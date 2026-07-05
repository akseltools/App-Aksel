/**
 * app/dashboard/page.tsx
 * Dashboard overview — KPI cards and recent stock movements.
 */

import { getSession } from "@/lib/auth/actions";
import { createServerClient, setSessionContext } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import {
  Package,
  AlertTriangle,
  Store,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  alert,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  alert?: boolean;
}) {
  return (
    <div
      className={`bg-[#141414] border rounded-lg p-5 flex flex-col gap-3 transition-all duration-200 hover:shadow-card-hover ${
        alert ? "border-aksel-800/60 bg-aksel-950/20" : "border-[#2a2a2a]"
      }`}
    >
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-zinc-500">{title}</p>
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center ${
            alert ? "bg-aksel-900/50" : "bg-[#1f1f1f]"
          }`}
        >
          <Icon
            className={`h-4 w-4 ${alert ? "text-aksel-400" : "text-zinc-400"}`}
          />
        </div>
      </div>
      <p
        className={`text-3xl font-bold tabular-nums ${
          alert ? "text-aksel-400" : "text-white"
        }`}
      >
        {value}
      </p>
      {subtitle && <p className="text-xs text-zinc-600">{subtitle}</p>}
    </div>
  );
}

export default async function DashboardPage() {
  const session = await getSession();
  const user = session.user!;
  const supabase = await createServerClient();
  await setSessionContext(supabase, user.id, user.role);

  // ─── Fetch KPI data ──────────────────────────────────────────────────────────
  const [
    { data: products },
    { data: openConsignments },
    { data: weeklyPaid },
    { data: recentMovements },
  ] = await Promise.all([
    supabase.from("products").select("id, current_stock, minimum_stock").eq("is_active", true),
    supabase.from("consignments").select("id").eq("status", "open"),
    supabase
      .from("weekly_closing")
      .select("amount_due")
      .eq("payment_status", "paid")
      .gte("week_reference", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)),
    supabase
      .from("stock_movements")
      .select("*, products(name), users(full_name, username)")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  // ─── Compute KPIs ────────────────────────────────────────────────────────────
  const totalProducts = products?.length ?? 0;
  const lowStockCount = products?.filter((p) => p.current_stock <= p.minimum_stock).length ?? 0;
  const openConsignmentsCount = openConsignments?.length ?? 0;
  const weeklyRevenue = weeklyPaid?.reduce((sum, r) => sum + (r.amount_due ?? 0), 0) ?? 0;

  // ─── Movement type label ────────────────────────────────────────────────────
  const movementLabel: Record<string, string> = {
    entry: "Entrada NF",
    exit_sale: "Venda",
    exit_consignment: "Consignação",
    return: "Retorno",
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Olá, {user.full_name ?? user.username}! Aqui está o resumo de hoje.
        </p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          title="Produtos em Estoque"
          value={totalProducts}
          subtitle="ferramentas ativas"
          icon={Package}
        />
        <KpiCard
          title="Alertas de Escassez"
          value={lowStockCount}
          subtitle={lowStockCount > 0 ? "requerem reposição urgente" : "estoque saudável"}
          icon={AlertTriangle}
          alert={lowStockCount > 0}
        />
        <KpiCard
          title="Consignações Abertas"
          value={openConsignmentsCount}
          subtitle="lojas com ferramentas"
          icon={Store}
        />
        {user.role === "admin" && (
          <KpiCard
            title="Receita da Semana"
            value={formatCurrency(weeklyRevenue)}
            subtitle="fechamentos pagos"
            icon={TrendingUp}
          />
        )}
      </div>

      {/* Recent movements table */}
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1f1f1f]">
          <h2 className="text-base font-semibold text-white">Movimentações Recentes</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1f1f1f] bg-[#0e0e0e]">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Tipo
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Produto
                </th>
                <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Qtd.
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Usuário
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Data
                </th>
              </tr>
            </thead>
            <tbody>
              {(!recentMovements || recentMovements.length === 0) ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-zinc-600">
                    Nenhuma movimentação registrada.
                  </td>
                </tr>
              ) : (
                (recentMovements as any[]).map((mov) => {
                  const isEntry = mov.movement_type === "entry" || mov.movement_type === "return";
                  return (
                    <tr
                      key={mov.id}
                      className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a] transition-colors duration-150"
                    >
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${
                            isEntry
                              ? "bg-green-950/60 text-green-400"
                              : "bg-aksel-950/60 text-aksel-400"
                          }`}
                        >
                          {isEntry ? (
                            <ArrowDownLeft className="h-3 w-3" />
                          ) : (
                            <ArrowUpRight className="h-3 w-3" />
                          )}
                          {movementLabel[mov.movement_type] ?? mov.movement_type}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-white font-medium">
                        {mov.products?.name ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-center tabular-nums text-zinc-300">
                        {isEntry ? "+" : "-"}{mov.quantity}
                      </td>
                      <td className="px-5 py-3 text-zinc-400">
                        {mov.users?.full_name ?? mov.users?.username ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-right text-zinc-500 text-xs">
                        {new Date(mov.created_at).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
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
    </div>
  );
}
