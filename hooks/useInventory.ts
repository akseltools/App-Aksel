/**
 * hooks/useInventory.ts
 * Custom hook for fetching and mutating inventory data.
 * Uses the browser Supabase client with real-time subscription.
 *
 * Returns:
 * - products: sorted list of active products
 * - isLoading: fetch state
 * - error: fetch error if any
 * - mutate: force-refresh the list
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import type { ProductRow } from "@/lib/supabase/types";

interface UseInventoryResult {
  products: ProductRow[];
  isLoading: boolean;
  error: string | null;
  mutate: () => void;
}

export function useInventory(): UseInventoryResult {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createBrowserClient();

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const { data, error: dbError } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (dbError) {
      console.error("[useInventory] Fetch error:", dbError);
      setError("Erro ao carregar estoque. Tente novamente.");
    } else {
      setProducts(data ?? []);
    }

    setIsLoading(false);
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Real-time subscription: re-fetch on any product change
  useEffect(() => {
    const channel = supabase
      .channel("products_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => {
          fetchProducts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchProducts]);

  return {
    products,
    isLoading,
    error,
    mutate: fetchProducts,
  };
}
