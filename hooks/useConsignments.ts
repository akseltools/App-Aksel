/**
 * hooks/useConsignments.ts
 * Hook to fetch open consignments with their items and product details.
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import type { ConsignmentRow } from "@/lib/supabase/types";

interface UseConsignmentsResult {
  consignments: ConsignmentRow[];
  isLoading: boolean;
  error: string | null;
  mutate: () => void;
}

export function useConsignments(): UseConsignmentsResult {
  const [consignments, setConsignments] = useState<ConsignmentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createBrowserClient();

  const fetchConsignments = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const { data, error: dbError } = await supabase
      .from("consignments")
      .select(`
        *,
        users(id, full_name, username),
        consignment_items(
          *,
          products(id, name, consigned_price)
        )
      `)
      .order("sent_at", { ascending: false });

    if (dbError) {
      setError("Erro ao carregar consignações.");
    } else {
      setConsignments((data as ConsignmentRow[]) ?? []);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchConsignments();
  }, [fetchConsignments]);

  // Real-time on consignment changes
  useEffect(() => {
    const channel = supabase
      .channel("consignments_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "consignments" }, fetchConsignments)
      .on("postgres_changes", { event: "*", schema: "public", table: "consignment_items" }, fetchConsignments)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, fetchConsignments]);

  return { consignments, isLoading, error, mutate: fetchConsignments };
}
