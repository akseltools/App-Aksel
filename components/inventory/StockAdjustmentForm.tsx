/**
 * components/inventory/StockAdjustmentForm.tsx
 * Form for adjusting inventory stock. Admin only.
 *
 * Features:
 * - Tab between relative adjustment (+/- quantity) and absolute stock setting
 * - Live preview of the adjustment action and the resulting new stock level
 * - Calls appropriate Supabase RPCs (rpc_add_stock_entry or rpc_add_stock_exit)
 * - Automatically refreshes details after save
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import { useToast } from "@/hooks/use-toast";
import { createBrowserClient } from "@/lib/supabase/client";
import type { ProductRow } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Settings, ArrowRight, CheckCircle2 } from "lucide-react";

interface StockAdjustmentFormProps {
  product: ProductRow;
  onSuccess?: () => void;
}

export default function StockAdjustmentForm({ product, onSuccess }: StockAdjustmentFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const supabase = createBrowserClient();

  const [mode, setMode] = useState<"relative" | "absolute">("relative");
  const [relativeQty, setRelativeQty] = useState("");
  const [absoluteVal, setAbsoluteVal] = useState("");
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // ─── Computed Values for Preview ───────────────────────────────────────────
  const currentStock = product.current_stock;
  
  let targetStock = currentStock;
  let movementDiff = 0;

  if (mode === "relative") {
    const qty = parseInt(relativeQty, 10);
    if (!isNaN(qty)) {
      movementDiff = qty;
      targetStock = Math.max(0, currentStock + qty);
    }
  } else {
    const val = parseInt(absoluteVal, 10);
    if (!isNaN(val) && val >= 0) {
      targetStock = val;
      movementDiff = val - currentStock;
    }
  }

  // ─── Submit Handler ────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({ title: "Sessão expirada. Faça login novamente.", variant: "destructive" });
      return;
    }

    if (movementDiff === 0) {
      toast({
        title: "Ajuste inválido",
        description: "A quantidade de ajuste não pode resultar em diferença zero.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const finalNotes = notes.trim() || `Ajuste manual de estoque`;
      let dbError;

      if (movementDiff > 0) {
        // Inbound / Entry
        const { error } = await supabase.rpc("rpc_add_stock_entry", {
          p_product_id: product.id,
          p_quantity: movementDiff,
          p_user_id: user.id,
          p_notes: finalNotes,
        });
        dbError = error;
      } else {
        // Outbound / Exit (diff is negative)
        const { error } = await supabase.rpc("rpc_add_stock_exit", {
          p_product_id: product.id,
          p_quantity: Math.abs(movementDiff),
          p_user_id: user.id,
          p_movement_type: "exit_sale",
          p_notes: finalNotes,
        });
        dbError = error;
      }

      if (dbError) {
        toast({
          title: "Erro ao ajustar estoque",
          description: dbError.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Estoque ajustado com sucesso!",
        description: `Novo estoque: ${targetStock} unidades.`,
      });

      // Reset form fields
      setRelativeQty("");
      setAbsoluteVal("");
      setNotes("");
      
      onSuccess?.();
      router.refresh();
    } catch (err: any) {
      console.error("[StockAdjustmentForm] Unexpected error:", err);
      toast({
        title: "Erro inesperado",
        description: err.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Tabs
        value={mode}
        onValueChange={(val) => setMode(val as "relative" | "absolute")}
        className="w-full"
      >
        <TabsList className="grid grid-cols-2 bg-[#1a1a1a] border border-[#2a2a2a] p-1 h-10">
          <TabsTrigger
            value="relative"
            className="text-zinc-400 data-[state=active]:bg-[#2a2a2a] data-[state=active]:text-white"
          >
            Adicionar / Remover
          </TabsTrigger>
          <TabsTrigger
            value="absolute"
            className="text-zinc-400 data-[state=active]:bg-[#2a2a2a] data-[state=active]:text-white"
          >
            Definir Estoque Atual
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Relative quantity */}
        <TabsContent value="relative" className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="adj-qty" className="text-zinc-300 text-sm">
              Quantidade a alterar *
            </Label>
            <Input
              id="adj-qty"
              type="number"
              value={relativeQty}
              onChange={(e) => setRelativeQty(e.target.value)}
              placeholder="Ex: 5 ou -3"
              disabled={isLoading}
              className="bg-[#1a1a1a] border-[#2a2a2a] text-white placeholder:text-zinc-600"
            />
            <p className="text-xs text-zinc-500">
              Digite valores positivos para somar ao estoque e negativos (com o sinal menos "-") para remover.
            </p>
          </div>
        </TabsContent>

        {/* Tab 2: Absolute value */}
        <TabsContent value="absolute" className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="adj-abs" className="text-zinc-300 text-sm">
              Novo Estoque Total *
            </Label>
            <Input
              id="adj-abs"
              type="number"
              min="0"
              value={absoluteVal}
              onChange={(e) => setAbsoluteVal(e.target.value)}
              placeholder={`Atual: ${currentStock}`}
              disabled={isLoading}
              className="bg-[#1a1a1a] border-[#2a2a2a] text-white placeholder:text-zinc-600"
            />
            <p className="text-xs text-zinc-500">
              Digite o número exato de unidades disponíveis hoje em estoque.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Common Notes field */}
      <div className="space-y-1.5">
        <Label htmlFor="adj-notes" className="text-zinc-300 text-sm">
          Motivo / Observação
        </Label>
        <Input
          id="adj-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ex: Correção de digitação, contagem física..."
          disabled={isLoading}
          className="bg-[#1a1a1a] border-[#2a2a2a] text-white placeholder:text-zinc-600"
        />
      </div>

      {/* Live Preview Card */}
      {movementDiff !== 0 && (
        <div className="bg-[#18181b] border border-[#27272a] rounded-lg p-3.5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            <Settings className="h-3.5 w-3.5" />
            Resumo do Ajuste
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="text-zinc-400">Estoque Atual</span>
              <span className="font-semibold text-white">{currentStock}</span>
            </div>
            <ArrowRight className="h-4 w-4 text-zinc-600" />
            <div className="flex items-center gap-2">
              <span className="text-zinc-400">Novo Estoque</span>
              <span className="font-bold text-white">{targetStock}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <CheckCircle2 className="h-3.5 w-3.5 text-zinc-500" />
            <span className="text-zinc-400">
              Será registrada uma movimentação de{" "}
              <strong className={movementDiff > 0 ? "text-green-400" : "text-aksel-400"}>
                {movementDiff > 0 ? `+${movementDiff}` : `${movementDiff}`}
              </strong>{" "}
              unidades.
            </span>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isLoading || movementDiff === 0}
        className="w-full bg-aksel-600 hover:bg-aksel-700 disabled:bg-[#2a2a2a] disabled:text-zinc-500 text-white font-semibold
                   transition-all duration-200 hover:-translate-y-0.5 hover:shadow-aksel-sm
                   active:translate-y-0 active:scale-[0.98]"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processando Ajuste...
          </>
        ) : (
          "Salvar Ajuste de Estoque"
        )}
      </Button>
    </form>
  );
}
