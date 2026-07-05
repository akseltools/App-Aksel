/**
 * lib/supabase/types.ts
 * TypeScript interfaces matching the Supabase database schema.
 * These types are used throughout the application for type safety.
 *
 * Update this file if you add new columns or tables.
 */

// ─── Row Types (what comes back from SELECT) ──────────────────────────────────

export type UserRow = {
  id: string;
  username: string;
  pin_hash: string;
  role: "admin" | "representative";
  full_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ProductRow = {
  id: string;
  name: string;
  cost_price: number;
  consigned_price: number;
  consumer_price: number; // Generated column: cost_price * 1.30
  current_stock: number;
  minimum_stock: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type StockMovementRow = {
  id: string;
  product_id: string;
  user_id: string;
  movement_type: "entry" | "exit_sale" | "exit_consignment" | "return";
  quantity: number;
  unit_price: number | null;
  notes: string | null;
  created_at: string;
  // Joined fields (when using .select('*, products(*), users(*)'))
  products?: Pick<ProductRow, "id" | "name">;
  users?: Pick<UserRow, "id" | "full_name" | "username">;
};

export type ConsignmentRow = {
  id: string;
  store_name: string;
  representative_id: string | null;
  sent_at: string;
  status: "open" | "closed";
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  users?: Pick<UserRow, "id" | "full_name" | "username">;
  consignment_items?: ConsignmentItemRow[];
};

export type ConsignmentItemRow = {
  id: string;
  consignment_id: string;
  product_id: string;
  quantity_sent: number;
  quantity_returned: number;
  quantity_sold: number; // Generated column: sent - returned
  unit_price: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  products?: Pick<ProductRow, "id" | "name" | "consigned_price">;
};

export type WeeklyClosingRow = {
  id: string;
  consignment_id: string | null;
  store_name: string;
  amount_due: number;
  payment_status: "pending" | "paid";
  week_reference: string; // ISO date string (YYYY-MM-DD)
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type SaleRow = {
  id: string;
  user_id: string;
  total_amount: number;
  notes: string | null;
  created_at: string;
  // Joined fields
  users?: Pick<UserRow, "id" | "full_name" | "username">;
  sale_items?: SaleItemRow[];
};

export type SaleItemRow = {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  created_at: string;
  // Joined fields
  products?: Pick<ProductRow, "id" | "name">;
};

// ─── Insert Types (what we send to INSERT) ────────────────────────────────────

export type ProductInsert = Pick<
  ProductRow,
  "name" | "cost_price" | "consigned_price" | "current_stock" | "minimum_stock"
>;

export type ProductUpdate = Partial<
  Pick<ProductRow, "name" | "cost_price" | "consigned_price" | "minimum_stock" | "is_active">
>;

export type ConsignmentInsert = Pick<
  ConsignmentRow,
  "store_name" | "representative_id" | "notes"
>;

export type ConsignmentItemInsert = Pick<
  ConsignmentItemRow,
  "consignment_id" | "product_id" | "quantity_sent" | "unit_price"
>;

export type SaleInsert = Pick<SaleRow, "user_id" | "total_amount" | "notes">;

export type SaleItemInsert = Pick<
  SaleItemRow,
  "sale_id" | "product_id" | "quantity" | "unit_price"
>;

// ─── Auth Types ───────────────────────────────────────────────────────────────

/** The session payload stored in the iron-session cookie. */
export interface SessionUser {
  id: string;
  username: string;
  role: "admin" | "representative";
  full_name: string | null;
}

// ─── Database shape (for Supabase client generics) ────────────────────────────

export interface Database {
  public: {
    Tables: {
      users: {
        Row: UserRow;
        Insert: Omit<UserRow, "id" | "created_at" | "updated_at" | "full_name" | "is_active"> & {
          full_name?: string | null;
          is_active?: boolean;
        };
        Update: Partial<Omit<UserRow, "id" | "created_at">>;
        Relationships: [];
      };
      products: {
        Row: ProductRow;
        Insert: Omit<ProductRow, "id" | "consumer_price" | "created_at" | "updated_at" | "current_stock" | "minimum_stock" | "is_active"> & {
          current_stock?: number;
          minimum_stock?: number;
          is_active?: boolean;
        };
        Update: Partial<Omit<ProductRow, "id" | "consumer_price" | "created_at">>;
        Relationships: [];
      };
      stock_movements: {
        Row: StockMovementRow;
        Insert: Omit<StockMovementRow, "id" | "created_at" | "products" | "users" | "unit_price" | "notes"> & {
          unit_price?: number | null;
          notes?: string | null;
        };
        Update: {}; // Movements are immutable
        Relationships: [];
      };
      consignments: {
        Row: ConsignmentRow;
        Insert: Omit<ConsignmentRow, "id" | "created_at" | "updated_at" | "users" | "consignment_items" | "representative_id" | "sent_at" | "status" | "notes"> & {
          representative_id?: string | null;
          sent_at?: string;
          status?: "open" | "closed";
          notes?: string | null;
        };
        Update: Partial<Omit<ConsignmentRow, "id" | "created_at" | "users" | "consignment_items">>;
        Relationships: [];
      };
      consignment_items: {
        Row: ConsignmentItemRow;
        Insert: Omit<ConsignmentItemRow, "id" | "quantity_sold" | "created_at" | "updated_at" | "products" | "quantity_returned"> & {
          quantity_returned?: number;
        };
        Update: Partial<Omit<ConsignmentItemRow, "id" | "quantity_sold" | "created_at" | "updated_at" | "products">>;
        Relationships: [];
      };
      weekly_closing: {
        Row: WeeklyClosingRow;
        Insert: Omit<WeeklyClosingRow, "id" | "created_at" | "updated_at" | "consignment_id" | "payment_status" | "paid_at" | "notes"> & {
          consignment_id?: string | null;
          payment_status?: "pending" | "paid";
          paid_at?: string | null;
          notes?: string | null;
        };
        Update: Partial<Pick<WeeklyClosingRow, "payment_status" | "paid_at" | "notes">>;
        Relationships: [];
      };
      sales: {
        Row: SaleRow;
        Insert: Omit<SaleRow, "id" | "created_at" | "users" | "sale_items" | "notes"> & {
          notes?: string | null;
        };
        Update: {}; // Sales are immutable
        Relationships: [];
      };
      sale_items: {
        Row: SaleItemRow;
        Insert: Omit<SaleItemRow, "id" | "created_at" | "products">;
        Update: {}; // Sale items are immutable
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      set_session_context: {
        Args: { p_user_id: string; p_user_role: string };
        Returns: void;
      };
      rpc_add_stock_entry: {
        Args: { p_product_id: string; p_quantity: number; p_user_id: string; p_notes?: string };
        Returns: void;
      };
      rpc_add_stock_exit: {
        Args: {
          p_product_id: string;
          p_quantity: number;
          p_user_id: string;
          p_movement_type: string;
          p_unit_price?: number;
          p_notes?: string;
        };
        Returns: void;
      };
      rpc_return_consignment_item: {
        Args: { p_item_id: string; p_quantity: number; p_user_id: string };
        Returns: void;
      };
      rpc_generate_weekly_closing: {
        Args: { p_week_reference: string };
        Returns: number;
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
