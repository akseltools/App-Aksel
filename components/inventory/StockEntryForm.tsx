/**
 * components/inventory/StockEntryForm.tsx
 * Form to register NF (Nota Fiscal) stock entries.
 * Calls the rpc_add_stock_entry stored procedure for atomic update.
 */

"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth/context";
import { createBrowserClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { ProductRow } from "@/lib/supabase/types";
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
import { Loader2, PackagePlus } from "lucide-react";

interface StockEntryFormProps {
  products: ProductRow[];
  onSuccess?: () => void;
}

export default function StockEntryForm({ products, onSuccess }: StockEntryFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const supabase = createBrowserClient();

  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!productId) {
      toast({ title: "Selecione um produto.", variant: "destructive" });
      return;
    }

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      toast({ title: "Quantidade deve ser maior que zero.", variant: "destructive" });
      return;
    }

    if (!user) {
      toast({ title: "Sessão expirada. Faça login novamente.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.rpc("rpc_add_stock_entry", {
        p_product_id: productId,
        p_quantity: qty,
        p_user_id: user.id,
        p_notes: notes.trim() || undefined,
      });

      if (error) {
        toast({
          title: "Erro ao registrar entrada",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      const product = products.find((p) => p.id === productId);
      toast({
        title: "Entrada registrada!",
        description: `+${qty} unidades de ${product?.name ?? "produto"} adicionadas ao estoque.`,
      });

      // Reset form
      setProductId("");
      setQuantity("");
      setNotes("");
      onSuccess?.();
    } catch (err) {
      console.error("[StockEntryForm] Error:", err);
      toast({ title: "Erro inesperado.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Product select */}
      <div className="space-y-1.5">
        <Label className="text-zinc-300 text-sm">Produto *</Label>
        <Select value={productId} onValueChange={setProductId} disabled={isLoading}>
          <SelectTrigger className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
            <SelectValue placeholder="Selecione o produto..." />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a]">
            {products.map((p) => (
              <SelectItem key={p.id} value={p.id} className="text-white hover:bg-[#2a2a2a]">
                {p.name} (Estoque atual: {p.current_stock})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Quantity */}
      <div className="space-y-1.5">
        <Label htmlFor="entry-qty" className="text-zinc-300 text-sm">
          Quantidade Recebida *
        </Label>
        <Input
          id="entry-qty"
          type="number"
          min="1"
          step="1"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="0"
          disabled={isLoading}
          className="bg-[#1a1a1a] border-[#2a2a2a] text-white placeholder:text-zinc-600"
        />
      </div>

      {/* Notes (NF number etc.) */}
      <div className="space-y-1.5">
        <Label htmlFor="entry-notes" className="text-zinc-300 text-sm">
          Observações (ex: Nº NF)
        </Label>
        <Input
          id="entry-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="NF 00123, fornecedor..."
          disabled={isLoading}
          className="bg-[#1a1a1a] border-[#2a2a2a] text-white placeholder:text-zinc-600"
        />
      </div>

      {/* Submit */}
      <Button
        type="submit"
        disabled={isLoading}
        className="w-full bg-aksel-600 hover:bg-aksel-700 text-white font-semibold
                   transition-all duration-200 hover:-translate-y-0.5
                   active:translate-y-0 active:scale-[0.98]"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Registrando...
          </>
        ) : (
          <>
            <PackagePlus className="mr-2 h-4 w-4" />
            Registrar Entrada de Estoque
          </>
        )}
      </Button>
    </form>
  );
}
