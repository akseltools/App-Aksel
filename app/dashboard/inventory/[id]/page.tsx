/**
 * app/dashboard/inventory/[id]/page.tsx
 * Product detail/edit page — admin only.
 * Allows editing name, prices, and minimum stock. Also shows movement history.
 */

import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/actions";
import { createServerClient, setSessionContext } from "@/lib/supabase/server";
import ProductForm from "@/components/inventory/ProductForm";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { ArrowLeft, Package } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface ProductDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { id } = await params;
  const session = await getSession();
  const user = session.user!;

  // Only admin can access this page
  if (user.role !== "admin") {
    redirect("/dashboard/inventory");
  }

  const supabase = await createServerClient();
  await setSessionContext(supabase, user.id, user.role);

  // Fetch product
  const { data: product, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !product) {
    notFound();
  }

  // Fetch recent movements for this product
  const { data: movements } = await supabase
    .from("stock_movements")
    .select("*, users(full_name, username)")
    .eq("product_id", id)
    .order("created_at", { ascending: false })
    .limit(10);

  const movementLabel: Record<string, string> = {
    entry: "Entrada NF",
    exit_sale: "Venda",
    exit_consignment: "Consignação",
    return: "Retorno",
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Back link */}
      <Link href="/dashboard/inventory">
        <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-white gap-2 -ml-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar ao Estoque
        </Button>
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-aksel-900/50 border border-aksel-800/50 rounded-lg flex items-center justify-center">
          <Package className="h-5 w-5 text-aksel-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">{product.name}</h1>
          <p className="text-sm text-zinc-500">
            Estoque atual:{" "}
            <span
              className={`font-semibold ${
                product.current_stock <= product.minimum_stock ? "text-aksel-400" : "text-white"
              }`}
            >
              {product.current_stock} unidades
            </span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Edit form */}
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-lg p-5">
          <h2 className="text-base font-semibold text-white mb-4">Editar Produto</h2>
          <ProductForm product={product} />
        </div>

        {/* Price summary cards */}
        <div className="space-y-4">
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-lg p-5 space-y-3">
            <h2 className="text-base font-semibold text-white">Resumo de Preços</h2>
            <div className="space-y-2">
              {[
                { label: "Custo", value: product.cost_price, muted: true },
                { label: "Consignado", value: product.consigned_price },
                { label: "Consumidor Final (+30%)", value: product.consumer_price, accent: true },
              ].map((row) => (
                <div key={row.label} className="flex justify-between items-center py-2 border-b border-[#1f1f1f] last:border-0">
                  <span className={`text-sm ${row.muted ? "text-zinc-500" : "text-zinc-300"}`}>{row.label}</span>
                  <span className={`font-semibold tabular-nums ${row.accent ? "text-aksel-400" : "text-white"}`}>
                    {formatCurrency(row.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Movement history */}
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-lg p-5">
            <h2 className="text-base font-semibold text-white mb-3">Histórico de Movimentações</h2>
            {!movements || movements.length === 0 ? (
              <p className="text-sm text-zinc-600 text-center py-4">Nenhuma movimentação.</p>
            ) : (
              <div className="space-y-2">
                {(movements as any[]).map((mov) => {
                  const isEntry = mov.movement_type === "entry" || mov.movement_type === "return";
                  return (
                    <div key={mov.id} className="flex items-center justify-between py-2 border-b border-[#1f1f1f] last:border-0 text-sm">
                      <div>
                        <span className={`font-medium ${isEntry ? "text-green-400" : "text-aksel-400"}`}>
                          {isEntry ? "+" : "-"}{mov.quantity}
                        </span>
                        <span className="text-zinc-500 ml-2">{movementLabel[mov.movement_type]}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-zinc-400 text-xs">
                          {(mov as any).users?.full_name ?? (mov as any).users?.username}
                        </p>
                        <p className="text-zinc-600 text-xs">
                          {new Date(mov.created_at).toLocaleString("pt-BR", {
                            day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
