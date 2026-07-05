/**
 * hooks/useSales.ts
 * Hook for fetching recent sales history.
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@/lib/supabase/client";

export function useSales() {
  const [sales, setSales] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createBrowserClient();

  const fetchSales = useCallback(async () => {
    setIsLoading(true);
    const { data, error: dbErr } = await supabase
      .from("sales")
      .select("*, users(full_name, username), sale_items(*, products(name))")
      .order("created_at", { ascending: false })
      .limit(50);
    if (dbErr) setError("Erro ao carregar vendas.");
    else setSales(data ?? []);
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchSales(); }, [fetchSales]);

  return { sales, isLoading, error, mutate: fetchSales };
}
