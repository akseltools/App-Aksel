/**
 * app/dashboard/consignment/page.tsx
 * Consignment CRM page — view active consignments, create new ones, register returns.
 */

"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth/context";
import { useInventory } from "@/hooks/useInventory";
import { useConsignments } from "@/hooks/useConsignments";
import { createBrowserClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { useToast } from "@/hooks/use-toast";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TableSkeleton } from "@/components/shared/LoadingSpinner";
import {
  Plus,
  Store,
  PackageMinus,
  Loader2,
  Trash2,
  RotateCcw,
  Pencil,
} from "lucide-react";
import type { ProductRow } from "@/lib/supabase/types";

// ─── New Consignment Form ─────────────────────────────────────────────────────
interface CartItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

function NewConsignmentForm({
  products,
  onSuccess,
}: {
  products: ProductRow[];
  onSuccess: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const supabase = createBrowserClient();

  const [storeName, setStoreName] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selProductId, setSelProductId] = useState("");
  const [selQuantity, setSelQuantity] = useState("1");
  const [isLoading, setIsLoading] = useState(false);

  const addToCart = () => {
    const product = products.find((p) => p.id === selProductId);
    if (!product) return;
    const qty = parseInt(selQuantity, 10);
    if (isNaN(qty) || qty <= 0) {
      toast({ title: "Quantidade inválida.", variant: "destructive" });
      return;
    }
    setCart((prev) => {
      const existing = prev.find((c) => c.productId === selProductId);
      if (existing) {
        return prev.map((c) =>
          c.productId === selProductId ? { ...c, quantity: c.quantity + qty } : c
        );
      }
      return [...prev, {
        productId: product.id,
        productName: product.name,
        quantity: qty,
        unitPrice: product.consigned_price,
      }];
    });
    setSelProductId("");
    setSelQuantity("1");
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((c) => c.productId !== productId));
  };

  const cartTotal = cart.reduce((s, c) => s + c.quantity * c.unitPrice, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim()) {
      toast({ title: "Nome do lojista é obrigatório.", variant: "destructive" });
      return;
    }

    let finalCart = [...cart];
    if (finalCart.length === 0 && selProductId) {
      const product = products.find((p) => p.id === selProductId);
      const qty = parseInt(selQuantity, 10);
      if (product && qty > 0) {
        if (qty > product.current_stock) {
          toast({ title: "Estoque insuficiente.", variant: "destructive" });
          return;
        }
        finalCart.push({
          productId: product.id,
          productName: product.name,
          quantity: qty,
          unitPrice: product.consigned_price,
        });
      }
    }

    if (finalCart.length === 0) {
      toast({ title: "Adicione ao menos um produto.", variant: "destructive" });
      return;
    }
    if (!user) return;

    setIsLoading(true);
    try {
      // 1. Create consignment header
      const { data: consignment, error: consError } = await supabase
        .from("consignments")
        .insert({ store_name: storeName.trim(), representative_id: user.id })
        .select("id")
        .single();

      if (consError || !consignment) throw new Error(consError?.message);

      // 2. Insert items + exit stock for each
      for (const item of finalCart) {
        await supabase.from("consignment_items").insert({
          consignment_id: consignment.id,
          product_id: item.productId,
          quantity_sent: item.quantity,
          unit_price: item.unitPrice,
        });

        await supabase.rpc("rpc_add_stock_exit", {
          p_product_id: item.productId,
          p_quantity: item.quantity,
          p_user_id: user.id,
          p_movement_type: "exit_consignment",
          p_unit_price: item.unitPrice,
          p_notes: `Consignação para ${storeName.trim()}`,
        });
      }

      toast({ title: "Consignação criada!", description: `${finalCart.length} produto(s) enviado(s) para ${storeName}.` });
      setStoreName("");
      setCart([]);
      setSelProductId("");
      setSelQuantity("1");
      onSuccess();
    } catch (err: any) {
      toast({ title: "Erro ao criar consignação", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label className="text-zinc-300 text-sm">Nome do Lojista *</Label>
        <Input
          value={storeName}
          onChange={(e) => setStoreName(e.target.value)}
          placeholder="ex: Ferragens São Paulo"
          className="bg-[#1a1a1a] border-[#2a2a2a] text-white placeholder:text-zinc-600"
          disabled={isLoading}
        />
      </div>

      {/* Add products to cart */}
      <div className="space-y-2">
        <Label className="text-zinc-300 text-sm">Adicionar Produto</Label>
        <div className="flex gap-2">
          <Select value={selProductId} onValueChange={setSelProductId}>
            <SelectTrigger className="flex-1 bg-[#1a1a1a] border-[#2a2a2a] text-white">
              <SelectValue placeholder="Produto..." />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a]">
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id} className="text-white">
                  {p.name} (Est: {p.current_stock})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number" min="1" step="1"
            value={selQuantity}
            onChange={(e) => setSelQuantity(e.target.value)}
            className="w-20 bg-[#1a1a1a] border-[#2a2a2a] text-white"
          />
          <Button type="button" onClick={addToCart} variant="outline"
            className="border-[#2a2a2a] text-zinc-300 hover:bg-[#2a2a2a]">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Cart */}
      {cart.length > 0 && (
        <div className="bg-[#1a1a1a] rounded-lg divide-y divide-[#2a2a2a]">
          {cart.map((item) => (
            <div key={item.productId} className="flex items-center justify-between px-3 py-2.5 text-sm">
              <div>
                <p className="text-white font-medium">{item.productName}</p>
                <p className="text-zinc-500 text-xs">{item.quantity}x {formatCurrency(item.unitPrice)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-white font-semibold tabular-nums">
                  {formatCurrency(item.quantity * item.unitPrice)}
                </span>
                <button type="button" onClick={() => removeFromCart(item.productId)}
                  className="text-zinc-600 hover:text-aksel-400 transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
          <div className="flex justify-between px-3 py-2.5 font-semibold text-sm">
            <span className="text-zinc-400">Total</span>
            <span className="text-aksel-400 tabular-nums">{formatCurrency(cartTotal)}</span>
          </div>
        </div>
      )}

      <Button type="submit" disabled={isLoading || (cart.length === 0 && !selProductId)}
        className="w-full bg-aksel-600 hover:bg-aksel-700 text-white font-semibold">
        {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando...</> : <><PackageMinus className="mr-2 h-4 w-4" />Registrar Consignação</>}
      </Button>
    </form>
  );
}

// ─── Return Dialog ─────────────────────────────────────────────────────────────
function ReturnDialog({ item, onSuccess }: { item: any; onSuccess: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const supabase = createBrowserClient();
  const [qty, setQty] = useState("1");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const maxReturn = item.quantity_sent - item.quantity_returned;

  const handleReturn = async () => {
    const n = parseInt(qty, 10);
    if (isNaN(n) || n <= 0 || n > maxReturn) {
      toast({ title: "Quantidade inválida.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.rpc("rpc_return_consignment_item", {
      p_item_id: item.id,
      p_quantity: n,
      p_user_id: user!.id,
    });
    if (error) {
      toast({ title: "Erro ao registrar retorno", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Retorno registrado!", description: `${n} un. devolvida(s) ao estoque.` });
      setOpen(false);
      onSuccess();
    }
    setLoading(false);
  };

  if (maxReturn === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 text-xs text-zinc-400 hover:text-white gap-1">
          <RotateCcw className="h-3 w-3" />
          Retorno
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#141414] border-[#2a2a2a] text-white max-w-sm">
        <DialogHeader>
          <DialogTitle>Registrar Retorno</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-zinc-400">{item.products?.name}</p>
        <p className="text-xs text-zinc-600">Máximo disponível: {maxReturn} unidade(s)</p>
        <div className="flex gap-3 items-end mt-2">
          <div className="flex-1 space-y-1.5">
            <Label className="text-zinc-300 text-sm">Quantidade</Label>
            <Input type="number" min="1" max={maxReturn} value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="bg-[#1a1a1a] border-[#2a2a2a] text-white" />
          </div>
          <Button onClick={handleReturn} disabled={loading}
            className="bg-aksel-600 hover:bg-aksel-700 text-white">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Consignment Dialog ──────────────────────────────────────────────────
function EditConsignmentDialog({
  consignment,
  products,
  onClose,
  onSuccess,
}: {
  consignment: any;
  products: ProductRow[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const supabase = createBrowserClient();
  const [loading, setLoading] = useState(false);
  const [localItems, setLocalItems] = useState<any[]>([]);
  const [selProductId, setSelProductId] = useState("");
  const [selQty, setSelQty] = useState("1");

  // Load items on mount / change
  useEffect(() => {
    if (consignment) {
      setLocalItems(
        (consignment.consignment_items ?? []).map((item: any) => ({
          id: item.id,
          product_id: item.product_id,
          product_name: item.products?.name || "Produto",
          quantity_sent: item.quantity_sent,
          quantity_returned: item.quantity_returned,
          unit_price: item.unit_price,
          isNew: false,
          isDeleted: false,
        }))
      );
    }
  }, [consignment]);

  const handleQtyChange = (id: string, val: string) => {
    const qty = parseInt(val, 10);
    if (isNaN(qty)) return;

    setLocalItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        // Cannot reduce below quantity_returned
        const minQty = item.quantity_returned;
        const finalQty = qty < minQty ? minQty : qty;
        return { ...item, quantity_sent: finalQty };
      })
    );
  };

  const handleRemoveItem = (id: string) => {
    setLocalItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return { ...item, isDeleted: true };
      })
    );
  };

  const handleAddNewItem = () => {
    if (!selProductId) return;
    const qty = parseInt(selQty, 10);
    if (isNaN(qty) || qty <= 0) return;

    const prod = products.find((p) => p.id === selProductId);
    if (!prod) return;

    // Check if product is already in the list
    const existing = localItems.find((item) => item.product_id === selProductId && !item.isDeleted);
    if (existing) {
      toast({ title: "Produto já está na lista.", description: "Edite a quantidade dele diretamente.", variant: "destructive" });
      return;
    }

    const newItem = {
      id: `new_${Date.now()}`,
      product_id: selProductId,
      product_name: prod.name,
      quantity_sent: qty,
      quantity_returned: 0,
      unit_price: prod.consigned_price,
      isNew: true,
      isDeleted: false,
    };

    setLocalItems((prev) => [...prev, newItem]);
    setSelProductId("");
    setSelQty("1");
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // 1. Pre-validate stock for additions
      for (const item of localItems) {
        if (item.isDeleted) continue;
        const oldItem = (consignment.consignment_items ?? []).find((i: any) => i.id === item.id);
        const oldQty = oldItem ? oldItem.quantity_sent : 0;
        const diff = item.quantity_sent - oldQty;

        if (diff > 0) {
          const prod = products.find((p) => p.id === item.product_id);
          if (!prod || prod.current_stock < diff) {
            toast({
              title: "Estoque insuficiente",
              description: `O produto "${prod?.name || "Desconhecido"}" possui apenas ${prod?.current_stock || 0} un. em estoque.`,
              variant: "destructive",
            });
            setLoading(false);
            return;
          }
        }
      }

      // 2. Perform updates
      // Loop over original items to check for modifications or deletions
      for (const oldItem of consignment.consignment_items ?? []) {
        const localItem = localItems.find((i) => i.id === oldItem.id);

        if (!localItem || localItem.isDeleted) {
          // Item was deleted
          const rem = oldItem.quantity_sent - oldItem.quantity_returned;
          if (rem > 0) {
            // Restore stock
            const prod = products.find((p) => p.id === oldItem.product_id);
            const currentStock = prod ? prod.current_stock : 0;

            await supabase
              .from("products")
              .update({ current_stock: currentStock + rem })
              .eq("id", oldItem.product_id);

            await supabase
              .from("stock_movements")
              .insert({
                product_id: oldItem.product_id,
                user_id: user?.id || consignment.representative_id,
                movement_type: "return",
                quantity: rem,
                notes: `Removido da consignação de ${consignment.store_name} (Edição)`,
              });
          }

          // Delete from DB
          await supabase
            .from("consignment_items")
            .delete()
            .eq("id", oldItem.id);
        } else {
          // Item exists. Check if quantity changed
          const diff = localItem.quantity_sent - oldItem.quantity_sent;
          if (diff !== 0) {
            const prod = products.find((p) => p.id === oldItem.product_id);
            const currentStock = prod ? prod.current_stock : 0;

            if (diff > 0) {
              // Decrement stock
              await supabase
                .from("products")
                .update({ current_stock: currentStock - diff })
                .eq("id", oldItem.product_id);

              await supabase
                .from("stock_movements")
                .insert({
                  product_id: oldItem.product_id,
                  user_id: user?.id || consignment.representative_id,
                  movement_type: "exit_consignment",
                  quantity: diff,
                  notes: `Adicionado à consignação de ${consignment.store_name} (Edição)`,
                });
            } else {
              // Increment stock
              const absDiff = Math.abs(diff);
              await supabase
                .from("products")
                .update({ current_stock: currentStock + absDiff })
                .eq("id", oldItem.product_id);

              await supabase
                .from("stock_movements")
                .insert({
                  product_id: oldItem.product_id,
                  user_id: user?.id || consignment.representative_id,
                  movement_type: "return",
                  quantity: absDiff,
                  notes: `Retornado da consignação de ${consignment.store_name} (Edição)`,
                });
            }

            // Update item qty in DB
            await supabase
              .from("consignment_items")
              .update({ quantity_sent: localItem.quantity_sent })
              .eq("id", oldItem.id);
          }
        }
      }

      // 3. Process new items
      for (const newItem of localItems.filter((i) => i.isNew && !i.isDeleted)) {
        const prod = products.find((p) => p.id === newItem.product_id);
        const currentStock = prod ? prod.current_stock : 0;

        // Decrement stock
        await supabase
          .from("products")
          .update({ current_stock: currentStock - newItem.quantity_sent })
          .eq("id", newItem.product_id);

        await supabase
          .from("stock_movements")
          .insert({
            product_id: newItem.product_id,
            user_id: user?.id || consignment.representative_id,
            movement_type: "exit_consignment",
            quantity: newItem.quantity_sent,
            notes: `Adicionado à consignação de ${consignment.store_name} (Edição)`,
          });

        // Insert new item in DB
        await supabase
          .from("consignment_items")
          .insert({
            consignment_id: consignment.id,
            product_id: newItem.product_id,
            quantity_sent: newItem.quantity_sent,
            unit_price: newItem.unit_price,
          });
      }

      toast({ title: "Alterações salvas!", description: "A consignação e o estoque foram atualizados." });
      onSuccess();
    } catch (err: any) {
      toast({ title: "Erro ao salvar edições", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Products available to add (not in localItems)
  const availableProducts = products.filter(
    (p) => p.is_active && !localItems.some((item) => item.product_id === p.id && !item.isDeleted)
  );

  const activeLocalItems = localItems.filter((i) => !i.isDeleted);

  return (
    <Dialog open={!!consignment} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-[#141414] border-[#2a2a2a] text-white max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Consignação — {consignment?.store_name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {/* Item List */}
          <div className="space-y-2">
            <Label className="text-zinc-400 text-xs uppercase tracking-wider">Itens Atuais</Label>
            {activeLocalItems.length === 0 ? (
              <p className="text-sm text-zinc-500 py-2">Nenhum item na consignação.</p>
            ) : (
              <div className="divide-y divide-[#2a2a2a] bg-[#1a1a1a] rounded-lg overflow-hidden">
                {activeLocalItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 text-sm">
                    <div className="flex-1 min-w-0 pr-3">
                      <p className="text-white font-medium truncate">{item.product_name}</p>
                      <p className="text-zinc-500 text-xs mt-0.5">
                        {item.quantity_returned} devolvido(s) · {formatCurrency(item.unit_price)}/un
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <Label className="text-zinc-400 text-xs">Env:</Label>
                        <Input
                          type="number"
                          min={item.quantity_returned}
                          value={item.quantity_sent}
                          onChange={(e) => handleQtyChange(item.id, e.target.value)}
                          className="w-16 h-8 bg-[#242424] border-[#3a3a3a] text-white text-center p-1"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveItem(item.id)}
                        className="h-8 w-8 text-zinc-600 hover:text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add New Product Section */}
          <div className="space-y-2 border-t border-[#2a2a2a] pt-3">
            <Label className="text-zinc-400 text-xs uppercase tracking-wider">Adicionar Produto</Label>
            <div className="flex gap-2">
              <Select value={selProductId} onValueChange={setSelProductId}>
                <SelectTrigger className="flex-1 bg-[#1a1a1a] border-[#2a2a2a] text-white h-9">
                  <SelectValue placeholder="Produto..." />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a]">
                  {availableProducts.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-white">
                      {p.name} (Est: {p.current_stock})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min="1"
                step="1"
                value={selQty}
                onChange={(e) => setSelQty(e.target.value)}
                className="w-16 h-9 bg-[#1a1a1a] border-[#2a2a2a] text-white text-center"
              />
              <Button
                type="button"
                onClick={handleAddNewItem}
                variant="outline"
                disabled={!selProductId}
                className="border-[#2a2a2a] text-zinc-300 hover:bg-[#2a2a2a] h-9 px-3"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-4 border-t border-[#2a2a2a] pt-3">
          <Button variant="outline" onClick={onClose} disabled={loading} className="border-[#2a2a2a] text-zinc-300">
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading} className="bg-aksel-600 hover:bg-aksel-700 text-white font-semibold">
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</> : "Salvar Alterações"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ConsignmentPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const supabase = createBrowserClient();
  const { products } = useInventory();
  const { consignments, isLoading, mutate } = useConsignments();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editConsignment, setEditConsignment] = useState<any | null>(null);

  const open = consignments.filter((c) => c.status === "open");
  const closed = consignments.filter((c) => c.status === "closed");

  const handleDeleteConsignment = async (consignment: any) => {
    if (!confirm(`Tem certeza que deseja excluir a consignação para "${consignment.store_name}"? Qualquer ferramenta não devolvida será retornada ao estoque.`)) {
      return;
    }
    setDeletingId(consignment.id);
    try {
      // 1. Get all items of the consignment
      const items = (consignment.consignment_items ?? []) as any[];

      // 2. Loop and restore stock
      for (const item of items) {
        const remaining = item.quantity_sent - item.quantity_returned;
        if (remaining > 0) {
          // Increment stock
          const { error: stockErr } = await supabase
            .from("products")
            .update({ current_stock: (item.products?.current_stock || 0) + remaining })
            .eq("id", item.product_id);

          if (stockErr) {
            console.error("Erro ao devolver estoque do produto:", item.product_id, stockErr);
          }

          // Insert audit movement
          await supabase
            .from("stock_movements")
            .insert({
              product_id: item.product_id,
              user_id: user?.id || consignment.representative_id,
              movement_type: "return",
              quantity: remaining,
              notes: `Exclusão de consignação para ${consignment.store_name}`
            });
        }
      }

      // 3. Delete any weekly closing records for this consignment
      await supabase
        .from("weekly_closing")
        .delete()
        .eq("consignment_id", consignment.id);

      // 4. Delete consignment (cascades to consignment_items)
      const { error: delErr } = await supabase
        .from("consignments")
        .delete()
        .eq("id", consignment.id);

      if (delErr) {
        toast({ title: "Erro ao excluir consignação", description: delErr.message, variant: "destructive" });
      } else {
        toast({ title: "Consignação excluída!", description: "Estoque atualizado com sucesso." });
        mutate();
      }
    } catch (err: any) {
      toast({ title: "Erro inesperado", description: err.message, variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Consignação</h1>
          <p className="text-sm text-zinc-500 mt-1">Ferramentas enviadas para lojistas.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-aksel-600 hover:bg-aksel-700 text-white font-semibold gap-2">
              <Plus className="h-4 w-4" />
              Nova Consignação
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#141414] border-[#2a2a2a] text-white max-w-lg">
            <DialogHeader>
              <DialogTitle>Registrar Consignação</DialogTitle>
            </DialogHeader>
            <NewConsignmentForm products={products} onSuccess={() => { setDialogOpen(false); mutate(); }} />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="open" className="w-full space-y-4">
        <TabsList className="bg-[#141414] border border-[#2a2a2a]">
          <TabsTrigger value="open" className="text-zinc-400 data-[state=active]:text-white">
            Abertas ({open.length})
          </TabsTrigger>
          <TabsTrigger value="closed" className="text-zinc-400 data-[state=active]:text-white">
            Fechadas ({closed.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="open" className="space-y-3 outline-none">
          {isLoading ? (
            <div className="bg-[#141414] border border-[#2a2a2a] rounded-lg overflow-hidden">
              <table className="w-full"><tbody><TableSkeleton rows={3} cols={5} /></tbody></table>
            </div>
          ) : open.length === 0 ? (
            <div className="bg-[#141414] border border-[#2a2a2a] rounded-lg px-5 py-12 text-center">
              <Store className="h-8 w-8 text-zinc-700 mx-auto mb-3" />
              <p className="text-sm text-zinc-500">Nenhuma consignação aberta.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {open.map((consignment) => {
                const items = (consignment.consignment_items ?? []) as any[];
                const totalValue = items.reduce((s, i) => s + i.quantity_sold * i.unit_price, 0);
                const totalSent = items.reduce((s, i) => s + i.quantity_sent, 0);

                return (
                  <div key={consignment.id} className="bg-[#141414] border border-[#2a2a2a] rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-white">{consignment.store_name}</h3>
                        <p className="text-xs text-zinc-500">
                          Enviado em {new Date(consignment.sent_at).toLocaleDateString("pt-BR")} · {totalSent} peça(s)
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-semibold text-aksel-400 tabular-nums">
                            {formatCurrency(totalValue)}
                          </p>
                          <p className="text-xs text-zinc-600">valor em aberto</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={deletingId === consignment.id}
                            onClick={() => setEditConsignment(consignment)}
                            className="h-8 w-8 text-zinc-400 hover:text-white"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={deletingId === consignment.id}
                            onClick={() => handleDeleteConsignment(consignment)}
                            className="h-8 w-8 text-zinc-400 hover:text-red-400"
                          >
                            {deletingId === consignment.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Items */}
                    <div className="divide-y divide-[#1f1f1f]">
                      {items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between py-2 text-sm">
                          <div className="flex-1">
                            <span className="text-zinc-300">{item.products?.name}</span>
                            <span className="text-zinc-600 ml-2 text-xs">
                              {item.quantity_sent} env · {item.quantity_returned} dev · {item.quantity_sold} vendido
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium tabular-nums">
                              {formatCurrency(item.quantity_sold * item.unit_price)}
                            </span>
                            <ReturnDialog item={item} onSuccess={mutate} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="closed" className="space-y-3 outline-none">
          {isLoading ? (
            <div className="bg-[#141414] border border-[#2a2a2a] rounded-lg overflow-hidden">
              <table className="w-full"><tbody><TableSkeleton rows={3} cols={5} /></tbody></table>
            </div>
          ) : closed.length === 0 ? (
            <div className="bg-[#141414] border border-[#2a2a2a] rounded-lg px-5 py-12 text-center">
              <Store className="h-8 w-8 text-zinc-700 mx-auto mb-3" />
              <p className="text-sm text-zinc-500">Nenhuma consignação fechada.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {closed.map((consignment) => {
                const items = (consignment.consignment_items ?? []) as any[];
                const totalValue = items.reduce((s, i) => s + i.quantity_sold * i.unit_price, 0);
                const totalSent = items.reduce((s, i) => s + i.quantity_sent, 0);

                return (
                  <div key={consignment.id} className="bg-[#141414] border border-[#2a2a2a] rounded-lg p-4 opacity-75">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-white">{consignment.store_name}</h3>
                          <Badge className="bg-green-500/10 text-green-400 border-green-500/30 font-normal">
                            Pago
                          </Badge>
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">
                          Enviado em {new Date(consignment.sent_at).toLocaleDateString("pt-BR")} · {totalSent} peça(s)
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-semibold text-green-400 tabular-nums">
                            {formatCurrency(totalValue)}
                          </p>
                          <p className="text-xs text-zinc-600">pago / finalizado</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={deletingId === consignment.id}
                          onClick={() => handleDeleteConsignment(consignment)}
                          className="h-8 w-8 text-zinc-400 hover:text-red-400"
                        >
                          {deletingId === consignment.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Items */}
                    <div className="divide-y divide-[#1f1f1f] pointer-events-none">
                      {items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between py-2 text-sm">
                          <div className="flex-1">
                            <span className="text-zinc-400">{item.products?.name}</span>
                            <span className="text-zinc-600 ml-2 text-xs">
                              {item.quantity_sent} env · {item.quantity_returned} dev · {item.quantity_sold} vendido
                            </span>
                          </div>
                          <span className="text-zinc-400 font-medium tabular-nums">
                            {formatCurrency(item.quantity_sold * item.unit_price)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <EditConsignmentDialog
        consignment={editConsignment}
        products={products}
        onClose={() => setEditConsignment(null)}
        onSuccess={() => {
          setEditConsignment(null);
          mutate();
        }}
      />
    </div>
  );
}
