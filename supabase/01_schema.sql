-- =============================================================================
-- AKSEL TOOLS — Supabase Complete Schema
-- Copy and paste this ENTIRE file into the Supabase SQL Editor and run it.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- EXTENSIONS
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- for gen_random_uuid()

-- ----------------------------------------------------------------------------
-- 1. USERS TABLE
-- Custom authentication (username + PIN hash). No Supabase Auth email needed.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username    TEXT UNIQUE NOT NULL,
  pin_hash    TEXT NOT NULL,         -- bcrypt hash of 4-digit PIN
  role        TEXT NOT NULL CHECK (role IN ('admin', 'representative')),
  full_name   TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.users IS 'Application users with username/PIN auth. Roles: admin or representative.';
COMMENT ON COLUMN public.users.pin_hash IS 'bcrypt hash of the 4-digit PIN. Never store raw PIN.';

-- ----------------------------------------------------------------------------
-- 2. PRODUCTS TABLE
-- Tool catalog. consumer_price is automatically calculated as cost_price + 30%.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT UNIQUE NOT NULL,
  cost_price       NUMERIC(10,2) NOT NULL CHECK (cost_price >= 0),
  consigned_price  NUMERIC(10,2) NOT NULL CHECK (consigned_price >= 0), -- Preço Consignado (manual)
  -- Computed: Preço Consumidor Final = Preço de Custo + 30%
  consumer_price   NUMERIC(10,2) GENERATED ALWAYS AS (ROUND(cost_price * 1.30, 2)) STORED,
  current_stock    INTEGER NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
  minimum_stock    INTEGER NOT NULL DEFAULT 5 CHECK (minimum_stock >= 0),
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.products IS 'Tool catalog. consumer_price is auto-calculated (cost_price * 1.30).';
COMMENT ON COLUMN public.products.consumer_price IS 'Auto-computed: cost_price * 1.30. Read-only — managed by DB.';
COMMENT ON COLUMN public.products.minimum_stock IS 'If current_stock <= minimum_stock, low-stock alert triggers in UI.';

-- ----------------------------------------------------------------------------
-- 3. STOCK MOVEMENTS TABLE
-- Audit trail for every inventory change (entries and exits).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.users(id),
  movement_type   TEXT NOT NULL CHECK (
    movement_type IN ('entry', 'exit_sale', 'exit_consignment', 'return')
  ),
  quantity        INTEGER NOT NULL CHECK (quantity > 0),
  unit_price      NUMERIC(10,2),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.stock_movements IS 'Full audit trail of every stock change. Never delete rows.';
COMMENT ON COLUMN public.stock_movements.movement_type IS 'entry=NF inbound, exit_sale=PF sale, exit_consignment=sent to store, return=consignment return.';

-- ----------------------------------------------------------------------------
-- 4. CONSIGNMENTS TABLE
-- Batches of tools sent to a specific store (lojista).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.consignments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name        TEXT NOT NULL,
  representative_id UUID REFERENCES public.users(id),
  sent_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status            TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.consignments IS 'Each row = one batch of tools sent to a store on consignment.';

-- ----------------------------------------------------------------------------
-- 5. CONSIGNMENT ITEMS TABLE
-- Individual tool lines within a consignment batch.
-- quantity_sold is auto-calculated: sent - returned.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.consignment_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consignment_id    UUID NOT NULL REFERENCES public.consignments(id) ON DELETE CASCADE,
  product_id        UUID NOT NULL REFERENCES public.products(id),
  quantity_sent     INTEGER NOT NULL CHECK (quantity_sent > 0),
  quantity_returned INTEGER NOT NULL DEFAULT 0 CHECK (quantity_returned >= 0),
  -- quantity_sold = how many the store actually sold (auto-computed)
  quantity_sold     INTEGER GENERATED ALWAYS AS (quantity_sent - quantity_returned) STORED,
  unit_price        NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.consignment_items IS 'Line items for each consignment. quantity_sold is computed by DB.';

-- ----------------------------------------------------------------------------
-- 6. WEEKLY CLOSING TABLE
-- Financial accrual per store, triggered manually by admin.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.weekly_closing (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consignment_id  UUID REFERENCES public.consignments(id),
  store_name      TEXT NOT NULL,
  amount_due      NUMERIC(10,2) NOT NULL CHECK (amount_due >= 0),
  payment_status  TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid')),
  week_reference  DATE NOT NULL,  -- The Friday date of this closing period
  paid_at         TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.weekly_closing IS 'Friday financial closing records per store.';
COMMENT ON COLUMN public.weekly_closing.week_reference IS 'The Friday date that closes this financial period.';

-- ----------------------------------------------------------------------------
-- 7. SALES TABLE
-- Direct person-física (PF) sales header.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sales (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.users(id),
  total_amount  NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.sales IS 'Direct PF sales (balcão). Linked to sale_items for line detail.';

-- ----------------------------------------------------------------------------
-- 8. SALE ITEMS TABLE
-- Line items for each direct sale.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sale_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id     UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES public.products(id),
  quantity    INTEGER NOT NULL CHECK (quantity > 0),
  unit_price  NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.sale_items IS 'Line items for direct PF sales.';

-- ============================================================================
-- TRIGGERS — auto-update updated_at columns
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_consignments_updated_at
  BEFORE UPDATE ON public.consignments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_consignment_items_updated_at
  BEFORE UPDATE ON public.consignment_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_weekly_closing_updated_at
  BEFORE UPDATE ON public.weekly_closing
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- INDEXES — for common query patterns
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON public.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON public.stock_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_consignments_status ON public.consignments(status);
CREATE INDEX IF NOT EXISTS idx_consignment_items_consignment ON public.consignment_items(consignment_id);
CREATE INDEX IF NOT EXISTS idx_weekly_closing_week ON public.weekly_closing(week_reference);
CREATE INDEX IF NOT EXISTS idx_weekly_closing_status ON public.weekly_closing(payment_status);
CREATE INDEX IF NOT EXISTS idx_sales_user ON public.sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON public.sale_items(sale_id);
