/**
 * components/inventory/ProductForm.tsx
 * Form for adding or editing a product. Admin only.
 *
 * Features:
 * - Live preview of consumer_price (cost + 30%)
 * - Can be used in a Dialog (modal) or standalone
 * - Calls server actions for insert/update
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { createBrowserClient } from "@/lib/supabase/client";
import { calculateConsumerPrice } from "@/lib/utils/calculateMargin";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import type { ProductRow } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, TrendingUp } from "lucide-react";

interface ProductFormProps {
  /** If provided, the form pre-fills with the product's data (edit mode). */
  product?: ProductRow;
  /** Called after a successful save (e.g., to close dialog or navigate). */
  onSuccess?: () => void;
}

export default function ProductForm({ product, onSuccess }: ProductFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createBrowserClient();

  const isEditing = !!product;

  // ─── Form state ─────────────────────────────────────────────────────────────
  const [name, setName] = useState(product?.name ?? "");
  const [costPrice, setCostPrice] = useState(String(product?.cost_price ?? ""));
  const [consignedPrice, setConsignedPrice] = useState(String(product?.consigned_price ?? ""));
  const [minimumStock, setMinimumStock] = useState(String(product?.minimum_stock ?? "5"));
  const [isLoading, setIsLoading] = useState(false);

  // ─── Computed consumer price preview ────────────────────────────────────────
  const parsedCost = parseFloat(costPrice.replace(",", ".")) || 0;
  const previewConsumerPrice = calculateConsumerPrice(parsedCost);

  // ─── Validation ─────────────────────────────────────────────────────────────
  const validate = (): string | null => {
    if (!name.trim()) return "Nome do produto é obrigatório.";
    if (parsedCost <= 0) return "Preço de custo deve ser maior que zero.";
    const parsedConsigned = parseFloat(consignedPrice.replace(",", "."));
    if (isNaN(parsedConsigned) || parsedConsigned <= 0)
      return "Preço consignado deve ser maior que zero.";
    const parsedMin = parseInt(minimumStock, 10);
    if (isNaN(parsedMin) || parsedMin < 0)
      return "Estoque mínimo não pode ser negativo.";
    return null;
  };

  // ─── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validate();
    if (validationError) {
      toast({ title: "Erro de validação", description: validationError, variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        name: name.trim(),
        cost_price: parseFloat(costPrice.replace(",", ".")),
        consigned_price: parseFloat(consignedPrice.replace(",", ".")),
        minimum_stock: parseInt(minimumStock, 10),
      };

      let dbError;

      if (isEditing) {
        // Update existing product
        const { error } = await supabase
          .from("products")
          .update(payload)
          .eq("id", product.id);
        dbError = error;
      } else {
        // Insert new product
        const { error } = await supabase
          .from("products")
          .insert({ ...payload, current_stock: 0 });
        dbError = error;
      }

      if (dbError) {
        console.error("[ProductForm] DB error:", dbError);
        toast({
          title: "Erro ao salvar",
          description: "Falha ao salvar produto. Tente novamente.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: isEditing ? "Produto atualizado!" : "Produto cadastrado!",
        description: name,
      });

      onSuccess?.();
      router.refresh();
    } catch (err) {
      console.error("[ProductForm] Unexpected error:", err);
      toast({
        title: "Erro inesperado",
        description: "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Product name */}
      <div className="space-y-1.5">
        <Label htmlFor="prod-name" className="text-zinc-300 text-sm">
          Nome do Produto *
        </Label>
        <Input
          id="prod-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ex: Furadeira de Impacto 750W"
          disabled={isLoading}
          className="bg-[#1a1a1a] border-[#2a2a2a] text-white placeholder:text-zinc-600"
        />
      </div>

      {/* Prices row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Cost price */}
        <div className="space-y-1.5">
          <Label htmlFor="prod-cost" className="text-zinc-300 text-sm">
            Preço de Custo (R$) *
          </Label>
          <Input
            id="prod-cost"
            type="number"
            step="0.01"
            min="0"
            value={costPrice}
            onChange={(e) => setCostPrice(e.target.value)}
            placeholder="0,00"
            disabled={isLoading}
            className="bg-[#1a1a1a] border-[#2a2a2a] text-white placeholder:text-zinc-600"
          />
        </div>

        {/* Consigned price */}
        <div className="space-y-1.5">
          <Label htmlFor="prod-consigned" className="text-zinc-300 text-sm">
            Preço Consignado (R$) *
          </Label>
          <Input
            id="prod-consigned"
            type="number"
            step="0.01"
            min="0"
            value={consignedPrice}
            onChange={(e) => setConsignedPrice(e.target.value)}
            placeholder="0,00"
            disabled={isLoading}
            className="bg-[#1a1a1a] border-[#2a2a2a] text-white placeholder:text-zinc-600"
          />
        </div>
      </div>

      {/* Computed consumer price preview */}
      {parsedCost > 0 && (
        <div className="flex items-center gap-3 bg-aksel-950/30 border border-aksel-900/50 rounded-lg px-4 py-3">
          <TrendingUp className="h-4 w-4 text-aksel-400 shrink-0" />
          <div>
            <p className="text-xs text-zinc-500">Preço Consumidor Final (auto-calculado)</p>
            <p className="text-lg font-bold text-aksel-400">
              {formatCurrency(previewConsumerPrice)}
            </p>
            <p className="text-xs text-zinc-600">
              Custo {formatCurrency(parsedCost)} + 30% de margem
            </p>
          </div>
        </div>
      )}

      {/* Minimum stock */}
      <div className="space-y-1.5">
        <Label htmlFor="prod-min-stock" className="text-zinc-300 text-sm">
          Estoque Mínimo (alerta)
        </Label>
        <Input
          id="prod-min-stock"
          type="number"
          min="0"
          step="1"
          value={minimumStock}
          onChange={(e) => setMinimumStock(e.target.value)}
          disabled={isLoading}
          className="bg-[#1a1a1a] border-[#2a2a2a] text-white"
        />
        <p className="text-xs text-zinc-500">
          A linha ficará vermelha quando o estoque atingir este valor.
        </p>
      </div>

      {/* Submit */}
      <Button
        type="submit"
        disabled={isLoading}
        className="w-full bg-aksel-600 hover:bg-aksel-700 text-white font-semibold
                   transition-all duration-200 hover:-translate-y-0.5 hover:shadow-aksel-sm
                   active:translate-y-0 active:scale-[0.98]"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Salvando...
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            {isEditing ? "Salvar Alterações" : "Cadastrar Produto"}
          </>
        )}
      </Button>
    </form>
  );
}
