-- =============================================================================
-- AKSEL TOOLS — Seed Data (Tabela de preços de Ferramentas e Insumos)
-- Run AFTER all other SQL files.
-- Creates initial admin and representative users, and seeds the 71 catalog products.
-- =============================================================================

-- ─── USERS ───────────────────────────────────────────────────────────────────
INSERT INTO public.users (username, pin_hash, role, full_name)
VALUES
  (
    'antonio',
    -- O backend atualizará automaticamente no primeiro acesso com o hash do PIN '000000'
    'placeholder_hash_antonio',
    'admin',
    'Antônio'
  ),
  (
    'amanda',
    -- O backend atualizará automaticamente no primeiro acesso com o hash do PIN '123456'
    'placeholder_hash_amanda',
    'representative',
    'Amanda'
  ),
  (
    'rachel',
    -- O backend atualizará automaticamente no primeiro acesso com o hash do PIN '123456'
    'placeholder_hash_rachel',
    'representative',
    'Rachel'
  )
ON CONFLICT (username) DO NOTHING;

-- Garantir que a coluna 'name' de produtos seja única para podermos usar ON CONFLICT (name)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_product_name'
    ) THEN
        ALTER TABLE public.products ADD CONSTRAINT unique_product_name UNIQUE (name);
    END IF;
END;
$$;

-- ─── PRODUCTS (71 items from Catalog) ────────────────────────────────────────
-- Consigned price calculated as Cost Price * 1.15 (15% margin for store/representative markup)
-- Consumer price is automatically computed as Cost Price * 1.30 via database generated column
INSERT INTO public.products (name, cost_price, consigned_price, current_stock, minimum_stock)
VALUES
  ('Arame ER 70S-6 MIG 0.8 New 15kg', 215.40, 247.71, 0, 5),
  ('Arame ER 70S-6 MIG 1.0 New 15kg', 214.60, 246.79, 0, 5),
  ('Arame ER 70S-6 MIG 1.2 New 15kg', 193.70, 222.76, 0, 5),
  ('Arco de serra corta ferro 300mm', 26.90, 30.94, 0, 5),
  ('Chave de fenda 1/4 x 4', 7.75, 8.91, 0, 5),
  ('Chave de fenda 1/4 x 5', 7.75, 8.91, 0, 5),
  ('Chave de fenda 1/4 x 6', 7.75, 8.91, 0, 5),
  ('Chave de fenda 1/4 x 8', 7.75, 8.91, 0, 5),
  ('Chave de fenda 1/8 x 3', 4.90, 5.64, 0, 5),
  ('Chave de fenda 1/8 x 4', 4.90, 5.64, 0, 5),
  ('Chave de fenda 1/8 x 5', 4.90, 5.64, 0, 5),
  ('Chave de fenda 1/8 x 6', 4.90, 5.64, 0, 5),
  ('Chave de fenda 3/16 x 3', 5.50, 6.33, 0, 5),
  ('Chave de fenda 3/16 x 4', 5.50, 6.33, 0, 5),
  ('Chave de fenda 3/16 x 5', 5.50, 6.33, 0, 5),
  ('Chave de fenda 3/16 x 6', 5.50, 6.33, 0, 5),
  ('Chave de fenda 3/16 x 8', 7.75, 8.91, 0, 5),
  ('Chave de fenda 3/8 x 10', 15.47, 17.79, 0, 5),
  ('Chave de fenda 3/8 x 12', 15.47, 17.79, 0, 5),
  ('Chave de fenda 3/8 x 5', 21.95, 25.24, 0, 5),
  ('Chave de fenda 3/8 x 6', 21.97, 25.27, 0, 5),
  ('Chave de fenda 3/8 x 8', 15.47, 17.79, 0, 5),
  ('Chave de fenda 5/16 x 10', 11.60, 13.34, 0, 5),
  ('Chave de fenda 5/16 x 4', 11.60, 13.34, 0, 5),
  ('Chave de fenda 5/16 x 5', 11.60, 13.34, 0, 5),
  ('Chave de fenda 5/16 x 6', 11.60, 13.34, 0, 5),
  ('Chave de fenda 5/16 x 8', 11.60, 13.34, 0, 5),
  ('Chave Philips PH0 1/8 x 3', 6.50, 7.48, 0, 5),
  ('Chave Philips PH0 1/8 x 4', 6.50, 7.48, 0, 5),
  ('Chave Philips PH0 1/8 x 5', 6.50, 7.48, 0, 5),
  ('Chave Philips PH0 1/8 x 6', 6.50, 7.48, 0, 5),
  ('Chave Philips PH1 3/16 x 3', 6.50, 7.48, 0, 5),
  ('Chave Philips PH1 3/16 x 4', 6.50, 7.48, 0, 5),
  ('Chave Philips PH1 3/16 x 5', 6.50, 7.48, 0, 5),
  ('Chave Philips PH1 3/16 x 6', 6.50, 7.48, 0, 5),
  ('Chave Philips PH1 3/16 x 8', 9.75, 11.21, 0, 5),
  ('Chave Philips PH2 1/4 x 10', 13.20, 15.18, 0, 5),
  ('Chave Philips PH2 1/4 x 12', 15.20, 17.48, 0, 5),
  ('Chave Philips PH2 1/4 x 4', 8.35, 9.60, 0, 5),
  ('Chave Philips PH2 1/4 x 5', 8.45, 9.72, 0, 5),
  ('Chave Philips PH2 1/4 x 6', 8.70, 10.01, 0, 5),
  ('Chave Philips PH2 1/4 x 8', 9.60, 11.04, 0, 5),
  ('Chave Philips PH3 5/16 x 10', 15.60, 17.94, 0, 5),
  ('Chave Philips PH3 5/16 x 4', 15.60, 17.94, 0, 5),
  ('Chave Philips PH3 5/16 x 5', 15.60, 17.94, 0, 5),
  ('Chave Philips PH3 5/16 x 6', 15.60, 17.94, 0, 5),
  ('Chave Philips PH3 5/16 x 8', 15.60, 17.94, 0, 5),
  ('Chave Philips PH4 3/8 x 10', 20.70, 23.81, 0, 5),
  ('Chave Philips PH4 3/8 x 12', 20.70, 23.81, 0, 5),
  ('Chave Philips PH4 3/8 x 6', 17.95, 20.64, 0, 5),
  ('Chave Philips PH4 3/8 x 5', 17.60, 20.24, 0, 5),
  ('Chave Philips PH4 3/8 x 8', 18.10, 20.82, 0, 5),
  ('Conjunto de Soquetes 1/2" 29 pcs', 287.60, 330.74, 0, 5),
  ('Disco Cônico flap 4. 1/2 GR120', 5.20, 5.98, 0, 5),
  ('Disco Cônico flap 4. 1/2 GR80', 5.20, 5.98, 0, 5),
  ('Disco Cônico flap 7 GR120', 10.80, 12.42, 0, 5),
  ('Disco Cônico flap 7 GR60', 11.80, 13.57, 0, 5),
  ('Disco Cônico flap 7 GR80', 10.80, 12.42, 0, 5),
  ('Disco de corte 10 x 1/8 x 1', 12.40, 14.26, 0, 5),
  ('Disco de desbaste 4.1/2', 6.50, 7.48, 0, 5),
  ('Disco de desbaste 7', 11.20, 12.88, 0, 5),
  ('Espatula Metal 100mm', 15.45, 17.77, 0, 5),
  ('Espatula Metal 125mm', 15.80, 18.17, 0, 5),
  ('Espatula Metal 50mm 2 pol', 8.45, 9.72, 0, 5),
  ('Espatula Metal 75mm', 13.60, 15.64, 0, 5),
  ('Marreta cabo fibra 2,5lb/1,3KG', 58.50, 67.28, 0, 5),
  ('Marreta cabo fibra 2lb/1KG', 49.40, 56.81, 0, 5),
  ('Marreta cabo fibra 3lb/1,5KG', 78.10, 89.82, 0, 5),
  ('Marreta cabo fibra 4lb/2KG', 86.28, 99.22, 0, 5),
  ('Marreta cabo fibra 5lb/3KG', 124.15, 142.77, 0, 5),
  ('Martelo unha cabo fibra 29mm', 30.54, 35.12, 0, 5)
ON CONFLICT (name) DO NOTHING;
