/**
 * app/dashboard/inventory/page.tsx
 * Inventory management page.
 * Admin: sees cost price + can add/edit products.
 * Representative: sees stock without cost, no edit access.
 */

"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth/context";
import { useInventory } from "@/hooks/useInventory";
import InventoryTable from "@/components/inventory/InventoryTable";
import ProductForm from "@/components/inventory/ProductForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function InventoryPage() {
  const { user, isAdmin } = useAuth();
  const { products, isLoading, error, mutate } = useInventory();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Estoque</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {isAdmin
              ? "Gerencie os produtos, preços e alertas de escassez."
              : "Visualize o estoque disponível de ferramentas."}
          </p>
        </div>

        {/* Add product button — admin only */}
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-aksel-600 hover:bg-aksel-700 text-white font-semibold gap-2
                           transition-all duration-200 hover:-translate-y-0.5 hover:shadow-aksel-sm"
              >
                <Plus className="h-4 w-4" />
                Novo Produto
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#141414] border-[#2a2a2a] text-white max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-white text-lg">
                  Cadastrar Novo Produto
                </DialogTitle>
              </DialogHeader>
              <ProductForm
                onSuccess={() => {
                  setDialogOpen(false);
                  mutate();
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-aksel-950/30 border border-aksel-800/50 rounded-lg px-4 py-3 text-sm text-aksel-400">
          {error}
        </div>
      )}

      {/* Inventory table */}
      <InventoryTable
        products={products}
        isLoading={isLoading}
        isAdmin={isAdmin}
        mutate={mutate}
      />
    </div>
  );
}
