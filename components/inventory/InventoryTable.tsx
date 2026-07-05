/**
 * components/inventory/InventoryTable.tsx
 * Main inventory table component.
 *
 * Features:
 * - Search filter by product name
 * - Sort by any column (click header)
 * - Low stock rows highlighted in red (current_stock <= minimum_stock)
 * - Admin-only: shows cost_price column
 * - Edit button for admin
 */

"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { createBrowserClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { ProductRow } from "@/lib/supabase/types";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "@/components/shared/LoadingSpinner";
import {
  AlertTriangle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Pencil,
  Package,
  Trash2,
  Loader2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type SortField = "name" | "current_stock" | "minimum_stock" | "consumer_price" | "consigned_price" | "cost_price";
type SortDir = "asc" | "desc";

interface InventoryTableProps {
  products: ProductRow[];
  isLoading: boolean;
  isAdmin: boolean;
  mutate: () => void;
}

// ─── Sort header button ───────────────────────────────────────────────────────
function SortButton({
  field,
  label,
  currentSort,
  currentDir,
  onSort,
}: {
  field: SortField;
  label: string;
  currentSort: SortField;
  currentDir: SortDir;
  onSort: (field: SortField) => void;
}) {
  const isActive = currentSort === field;

  return (
    <button
      onClick={() => onSort(field)}
      className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors duration-150"
      aria-label={`Ordenar por ${label}`}
    >
      {label}
      {isActive ? (
        currentDir === "asc" ? (
          <ArrowUp className="h-3 w-3 text-aksel-400" />
        ) : (
          <ArrowDown className="h-3 w-3 text-aksel-400" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      )}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function InventoryTable({
  products,
  isLoading,
  isAdmin,
  mutate,
}: InventoryTableProps) {
  const { toast } = useToast();
  const supabase = createBrowserClient();
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteProduct = async (product: ProductRow) => {
    if (!confirm(`Tem certeza que deseja excluir o produto "${product.name}"?`)) {
      return;
    }
    setDeletingId(product.id);
    try {
      // Try to hard-delete first
      const { error: deleteErr } = await supabase
        .from("products")
        .delete()
        .eq("id", product.id);

      if (deleteErr) {
        // If it failed because of references (foreign key violation code: "23503")
        if (deleteErr.code === "23503") {
          if (confirm(`O produto "${product.name}" possui histórico de vendas ou consignações e não pode ser excluído permanentemente.\n\nDeseja desativá-lo (ocultar do sistema) em vez de excluir?`)) {
            const { error: updateErr } = await supabase
              .from("products")
              .update({ is_active: false })
              .eq("id", product.id);

            if (updateErr) {
              toast({ title: "Erro ao desativar produto", description: updateErr.message, variant: "destructive" });
            } else {
              toast({ title: "Produto desativado!", description: "O produto foi ocultado do catálogo com sucesso." });
              mutate();
            }
          }
        } else {
          toast({ title: "Erro ao excluir produto", description: deleteErr.message, variant: "destructive" });
        }
      } else {
        toast({ title: "Produto excluído!", description: "O produto foi removido permanentemente." });
        mutate();
      }
    } catch (err: any) {
      toast({ title: "Erro inesperado", description: err.message, variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  // ─── Sort handler ────────────────────────────────────────────────────────────
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  // ─── Filtered + sorted data ──────────────────────────────────────────────────
  const displayProducts = useMemo(() => {
    let filtered = products.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase())
    );

    filtered.sort((a, b) => {
      const av = a[sortField as keyof ProductRow] as string | number;
      const bv = b[sortField as keyof ProductRow] as string | number;
      const cmp = typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return sortDir === "asc" ? cmp : -cmp;
    });

    return filtered;
  }, [products, search, sortField, sortDir]);

  // ─── Low stock count ─────────────────────────────────────────────────────────
  const lowStockCount = products.filter(
    (p) => p.current_stock <= p.minimum_stock
  ).length;

  return (
    <div className="space-y-4">
      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Buscar produto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-[#1a1a1a] border-[#2a2a2a] text-white placeholder:text-zinc-600 h-9"
          />
        </div>

        {/* Low stock summary */}
        {lowStockCount > 0 && (
          <Badge
            variant="outline"
            className="text-aksel-400 border-aksel-800 bg-aksel-950/50 gap-1.5 animate-pulse-red"
          >
            <AlertTriangle className="h-3 w-3" />
            {lowStockCount} {lowStockCount === 1 ? "produto" : "produtos"} com estoque baixo
          </Badge>
        )}
      </div>

      {/* Table wrapper */}
      <div className="rounded-lg border border-[#2a2a2a] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="Tabela de estoque">
            {/* Header */}
            <thead>
              <tr className="border-b border-[#2a2a2a] bg-[#141414]">
                <th className="px-4 py-3 text-left">
                  <SortButton field="name" label="Produto" currentSort={sortField} currentDir={sortDir} onSort={handleSort} />
                </th>
                <th className="px-4 py-3 text-center">
                  <SortButton field="current_stock" label="Estoque" currentSort={sortField} currentDir={sortDir} onSort={handleSort} />
                </th>
                <th className="px-4 py-3 text-center">
                  <SortButton field="minimum_stock" label="Mínimo" currentSort={sortField} currentDir={sortDir} onSort={handleSort} />
                </th>
                {isAdmin && (
                  <th className="px-4 py-3 text-right">
                    <SortButton field="cost_price" label="Custo" currentSort={sortField} currentDir={sortDir} onSort={handleSort} />
                  </th>
                )}
                <th className="px-4 py-3 text-right">
                  <SortButton field="consigned_price" label="Consignado" currentSort={sortField} currentDir={sortDir} onSort={handleSort} />
                </th>
                <th className="px-4 py-3 text-right">
                  <SortButton field="consumer_price" label="Consumidor Final" currentSort={sortField} currentDir={sortDir} onSort={handleSort} />
                </th>
                {isAdmin && (
                  <th className="px-4 py-3 text-center text-zinc-500 text-xs font-semibold uppercase tracking-wider">
                    Ações
                  </th>
                )}
              </tr>
            </thead>

            {/* Body */}
            <tbody>
              {isLoading ? (
                <TableSkeleton rows={5} cols={isAdmin ? 7 : 5} />
              ) : displayProducts.length === 0 ? (
                <tr>
                  <td
                    colSpan={isAdmin ? 7 : 5}
                    className="px-4 py-16 text-center"
                  >
                    <div className="flex flex-col items-center gap-3 text-zinc-500">
                      <Package className="h-10 w-10 opacity-30" />
                      <p className="text-sm">
                        {search
                          ? "Nenhum produto encontrado."
                          : "Nenhum produto cadastrado ainda."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                displayProducts.map((product) => {
                  const isLowStock = product.current_stock <= product.minimum_stock;
                  const isCritical = product.current_stock === 0;

                  return (
                    <tr
                      key={product.id}
                      className={cn(
                        "border-b border-[#1f1f1f] transition-colors duration-150",
                        isLowStock
                          ? "bg-red-950/20 border-l-4 border-l-aksel-600 hover:bg-red-950/30"
                          : "hover:bg-[#1a1a1a]"
                      )}
                    >
                      {/* Product name */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {isLowStock && (
                            <AlertTriangle
                              className={cn(
                                "h-4 w-4 shrink-0",
                                isCritical ? "text-aksel-500 animate-pulse" : "text-yellow-500"
                              )}
                              aria-label={isCritical ? "Sem estoque" : "Estoque baixo"}
                            />
                          )}
                          <span className="font-medium text-white">{product.name}</span>
                        </div>
                      </td>

                      {/* Current stock */}
                      <td className="px-4 py-3 text-center">
                        <span
                          className={cn(
                            "font-semibold tabular-nums",
                            isCritical
                              ? "text-aksel-400"
                              : isLowStock
                              ? "text-yellow-400"
                              : "text-white"
                          )}
                        >
                          {product.current_stock}
                        </span>
                      </td>

                      {/* Minimum stock */}
                      <td className="px-4 py-3 text-center text-zinc-400 tabular-nums">
                        {product.minimum_stock}
                      </td>

                      {/* Cost price — admin only */}
                      {isAdmin && (
                        <td className="px-4 py-3 text-right text-zinc-400 tabular-nums">
                          {formatCurrency(product.cost_price)}
                        </td>
                      )}

                      {/* Consigned price */}
                      <td className="px-4 py-3 text-right text-white tabular-nums">
                        {formatCurrency(product.consigned_price)}
                      </td>

                      {/* Consumer price (computed) */}
                      <td className="px-4 py-3 text-right font-semibold text-aksel-400 tabular-nums">
                        {formatCurrency(product.consumer_price)}
                      </td>

                      {/* Admin actions */}
                      {isAdmin && (
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Link href={`/dashboard/inventory/${product.id}`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-zinc-500 hover:text-white hover:bg-[#2a2a2a]"
                                aria-label={`Editar ${product.name}`}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={deletingId === product.id}
                              onClick={() => handleDeleteProduct(product)}
                              className="h-8 w-8 p-0 text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                              aria-label={`Excluir ${product.name}`}
                            >
                              {deletingId === product.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer count */}
        {!isLoading && displayProducts.length > 0 && (
          <div className="px-4 py-2 bg-[#111111] border-t border-[#1f1f1f] text-xs text-zinc-500">
            {displayProducts.length}{" "}
            {displayProducts.length === 1 ? "produto" : "produtos"}
            {search && ` encontrado${displayProducts.length === 1 ? "" : "s"}`}
          </div>
        )}
      </div>
    </div>
  );
}
