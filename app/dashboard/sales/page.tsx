/**
 * app/dashboard/sales/page.tsx
 * Direct sales (Pessoa Física) page — accessible to both roles.
 * Multi-item cart → confirm → deducts stock + records sale.
 */

"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth/context";
import { useInventory } from "@/hooks/useInventory";
import { createBrowserClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ProductRow } from "@/lib/supabase/types";
import {
  Plus,
  Trash2,
  ShoppingCart,
  Loader2,
  CheckCircle2,
  ReceiptText,
} from "lucide-react";

interface CartItem {
  product: ProductRow;
  quantity: number;
}

export default function SalesPage() {
  const { user } = useAuth();
  const { products, mutate } = useInventory();
  const { toast } = useToast();
  const supabase = createBrowserClient();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [selProductId, setSelProductId] = useState("");
  const [selQty, setSelQty] = useState("1");
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastSale, setLastSale] = useState<{ items: CartItem[]; total: number } | null>(null);

  // Only show products with available stock
  const availableProducts = products.filter((p) => p.current_stock > 0);

  // Add selected product to cart
  const addToCart = () => {
    const product = availableProducts.find((p) => p.id === selProductId);
    if (!product) {
      toast({ title: "Selecione um produto.", variant: "destructive" });
      return;
    }
    const qty = parseInt(selQty, 10);
    if (isNaN(qty) || qty <= 0) {
      toast({ title: "Quantidade inválida.", variant: "destructive" });
      return;
    }

    // Check stock vs cart quantity
    const alreadyInCart = cart.find((c) => c.product.id === product.id);
    const qtyInCart = alreadyInCart?.quantity ?? 0;
    if (qtyInCart + qty > product.current_stock) {
      toast({
        title: "Estoque insuficiente",
        description: `Disponível: ${product.current_stock - qtyInCart} unidades.`,
        variant: "destructive",
      });
      return;
    }

    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === product.id);
      if (existing) {
        return prev.map((c) =>
          c.product.id === product.id ? { ...c, quantity: c.quantity + qty } : c
        );
      }
      return [...prev, { product, quantity: qty }];
    });

    setSelProductId("");
    setSelQty("1");
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((c) => c.product.id !== productId));
  };

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.product.consumer_price * item.quantity,
    0
  );

  // Confirm sale
  const handleConfirmSale = async () => {
    if (cart.length === 0) return;
    if (!user) return;

    setIsLoading(true);
    try {
      // 1. Create sale header
      const { data: sale, error: saleErr } = await supabase
        .from("sales")
        .insert({
          user_id: user.id,
          total_amount: cartTotal,
          notes: notes.trim() || null,
        })
        .select("id")
        .single();

      if (saleErr || !sale) throw new Error(saleErr?.message ?? "Erro ao criar venda.");

      // 2. Insert sale items + exit stock for each
      for (const item of cart) {
        const { error: itemErr } = await supabase.from("sale_items").insert({
          sale_id: sale.id,
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.product.consumer_price,
        });
        if (itemErr) throw new Error(itemErr.message);

        const { error: stockErr } = await supabase.rpc("rpc_add_stock_exit", {
          p_product_id: item.product.id,
          p_quantity: item.quantity,
          p_user_id: user.id,
          p_movement_type: "exit_sale",
          p_unit_price: item.product.consumer_price,
          p_notes: `Venda direta #${sale.id.slice(0, 8)}`,
        });
        if (stockErr) throw new Error(stockErr.message);
      }

      // Save last sale for success dialog
      setLastSale({ items: [...cart], total: cartTotal });
      setShowSuccess(true);

      // Reset cart
      setCart([]);
      setNotes("");
      mutate(); // Refresh inventory
    } catch (err: any) {
      toast({
        title: "Erro ao confirmar venda",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Venda Direta</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Registro de vendas no balcão para pessoa física.
        </p>
      </div>

      {/* Product selector */}
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-lg p-5 space-y-4">
        <h2 className="text-sm font-semibold text-zinc-300">Adicionar Produto</h2>
        <div className="flex gap-2">
          <Select value={selProductId} onValueChange={setSelProductId}>
            <SelectTrigger className="flex-1 bg-[#1a1a1a] border-[#2a2a2a] text-white">
              <SelectValue placeholder="Selecione um produto..." />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a] max-h-60">
              {availableProducts.map((p) => (
                <SelectItem key={p.id} value={p.id} className="text-white hover:bg-[#2a2a2a]">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-zinc-500 ml-2 text-xs">
                    Est: {p.current_stock} · {formatCurrency(p.consumer_price)}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number" min="1"
            value={selQty}
            onChange={(e) => setSelQty(e.target.value)}
            className="w-20 bg-[#1a1a1a] border-[#2a2a2a] text-white text-center"
          />
          <Button type="button" onClick={addToCart}
            className="bg-aksel-600 hover:bg-aksel-700 text-white gap-1 shrink-0">
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
        </div>

        {/* Price preview for selected product */}
        {selProductId && (() => {
          const p = availableProducts.find((p) => p.id === selProductId);
          if (!p) return null;
          return (
            <div className="bg-aksel-950/20 border border-aksel-900/40 rounded-md px-3 py-2 text-sm">
              <span className="text-zinc-400">Preço unitário: </span>
              <span className="font-bold text-aksel-300">{formatCurrency(p.consumer_price)}</span>
            </div>
          );
        })()}
      </div>

      {/* Cart */}
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-[#1f1f1f] flex items-center gap-2">
          <ShoppingCart className="h-4 w-4 text-zinc-400" />
          <h2 className="text-sm font-semibold text-zinc-300">
            Carrinho ({cart.length} {cart.length === 1 ? "item" : "itens"})
          </h2>
        </div>

        {cart.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-zinc-600">
            <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-30" />
            Nenhum produto adicionado.
          </div>
        ) : (
          <>
            <div className="divide-y divide-[#1f1f1f]">
              {cart.map((item) => (
                <div key={item.product.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="flex-1">
                    <p className="text-white font-medium text-sm">{item.product.name}</p>
                    <p className="text-zinc-500 text-xs mt-0.5">
                      {item.quantity} × {formatCurrency(item.product.consumer_price)}
                    </p>
                  </div>
                  <span className="text-white font-semibold tabular-nums">
                    {formatCurrency(item.quantity * item.product.consumer_price)}
                  </span>
                  <button onClick={() => removeFromCart(item.product.id)}
                    className="text-zinc-600 hover:text-aksel-400 transition-colors p-1"
                    aria-label={`Remover ${item.product.name}`}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Total + notes + confirm */}
            <div className="border-t border-[#2a2a2a] px-5 py-4 space-y-4">
              <div className="flex justify-between items-center text-lg font-bold">
                <span className="text-zinc-300">Total</span>
                <span className="text-aksel-400 tabular-nums">{formatCurrency(cartTotal)}</span>
              </div>

              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs">Observações (opcional)</Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Nome do cliente, forma de pagamento..."
                  className="bg-[#1a1a1a] border-[#2a2a2a] text-white placeholder:text-zinc-700 text-sm"
                />
              </div>

              <Button
                onClick={handleConfirmSale}
                disabled={isLoading || cart.length === 0}
                className="w-full bg-aksel-600 hover:bg-aksel-700 text-white font-semibold h-11 gap-2
                           transition-all duration-200 hover:-translate-y-0.5"
              >
                {isLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Processando...</>
                ) : (
                  <><CheckCircle2 className="h-4 w-4" />Confirmar Venda</>
                )}
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Success dialog */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="bg-[#141414] border-[#2a2a2a] text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-400">
              <CheckCircle2 className="h-5 w-5" />
              Venda Confirmada!
            </DialogTitle>
          </DialogHeader>
          {lastSale && (
            <div className="space-y-3">
              <div className="bg-[#1a1a1a] rounded-lg divide-y divide-[#2a2a2a]">
                {lastSale.items.map((item) => (
                  <div key={item.product.id} className="flex justify-between px-3 py-2 text-sm">
                    <span className="text-zinc-300">{item.product.name} ×{item.quantity}</span>
                    <span className="text-white font-medium">
                      {formatCurrency(item.quantity * item.product.consumer_price)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between px-3 py-2.5 font-bold">
                  <span className="text-zinc-300">Total</span>
                  <span className="text-aksel-400">{formatCurrency(lastSale.total)}</span>
                </div>
              </div>
              <Button onClick={() => setShowSuccess(false)}
                className="w-full bg-aksel-600 hover:bg-aksel-700 text-white gap-2">
                <ReceiptText className="h-4 w-4" />
                Nova Venda
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
