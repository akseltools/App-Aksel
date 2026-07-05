-- =============================================================================
-- AKSEL TOOLS — RPC Stored Procedures
-- Run AFTER 01_schema.sql and 02_rls_policies.sql
-- These functions execute atomically (entry + stock update in one transaction).
-- =============================================================================

-- ---------------------------------------------------------------
-- set_session_context: Called by Server Actions before any query.
-- Sets the user ID and role so RLS policies can read them.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_session_context(
  p_user_id   UUID,
  p_user_role TEXT
)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_user_id',   p_user_id::TEXT,   TRUE);
  PERFORM set_config('app.current_user_role',  p_user_role,       TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.set_session_context IS
  'Sets app.current_user_id and app.current_user_role for the current transaction. Called by every Server Action before touching data.';

-- ---------------------------------------------------------------
-- rpc_add_stock_entry: Atomically adds stock via NF entry.
-- Inserts a movement record + updates product current_stock.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_add_stock_entry(
  p_product_id  UUID,
  p_quantity    INTEGER,
  p_user_id     UUID,
  p_notes       TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Guard: quantity must be positive
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be greater than zero. Got: %', p_quantity;
  END IF;

  -- Insert audit movement record
  INSERT INTO public.stock_movements (product_id, user_id, movement_type, quantity, notes)
  VALUES (p_product_id, p_user_id, 'entry', p_quantity, p_notes);

  -- Update product stock atomically
  UPDATE public.products
  SET current_stock = current_stock + p_quantity
  WHERE id = p_product_id;

  -- Guard: product must exist
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found: %', p_product_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.rpc_add_stock_entry IS
  'Atomically records a stock entry (NF) and increments product current_stock.';

-- ---------------------------------------------------------------
-- rpc_add_stock_exit: Atomically removes stock (sale or consignment).
-- Inserts a movement record + decrements product current_stock.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_add_stock_exit(
  p_product_id      UUID,
  p_quantity        INTEGER,
  p_user_id         UUID,
  p_movement_type   TEXT,  -- 'exit_sale' or 'exit_consignment'
  p_unit_price      NUMERIC(10,2) DEFAULT NULL,
  p_notes           TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_current_stock INTEGER;
BEGIN
  -- Guard: quantity must be positive
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be greater than zero. Got: %', p_quantity;
  END IF;

  -- Guard: movement type must be valid
  IF p_movement_type NOT IN ('exit_sale', 'exit_consignment') THEN
    RAISE EXCEPTION 'Invalid movement type: %. Must be exit_sale or exit_consignment.', p_movement_type;
  END IF;

  -- Lock the product row and check stock
  SELECT current_stock INTO v_current_stock
  FROM public.products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found: %', p_product_id;
  END IF;

  IF v_current_stock < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock. Available: %, Requested: %', v_current_stock, p_quantity;
  END IF;

  -- Insert audit movement record
  INSERT INTO public.stock_movements (product_id, user_id, movement_type, quantity, unit_price, notes)
  VALUES (p_product_id, p_user_id, p_movement_type, p_quantity, p_unit_price, p_notes);

  -- Decrement stock atomically
  UPDATE public.products
  SET current_stock = current_stock - p_quantity
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.rpc_add_stock_exit IS
  'Atomically records a stock exit and decrements product current_stock. Raises exception if stock insufficient.';

-- ---------------------------------------------------------------
-- rpc_return_consignment_item: Handles partial/full returns from stores.
-- Increments quantity_returned + calls rpc_add_stock_entry.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_return_consignment_item(
  p_item_id     UUID,
  p_quantity    INTEGER,
  p_user_id     UUID
)
RETURNS VOID AS $$
DECLARE
  v_product_id        UUID;
  v_quantity_sent     INTEGER;
  v_quantity_returned INTEGER;
BEGIN
  -- Get item details
  SELECT product_id, quantity_sent, quantity_returned
  INTO v_product_id, v_quantity_sent, v_quantity_returned
  FROM public.consignment_items
  WHERE id = p_item_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Consignment item not found: %', p_item_id;
  END IF;

  -- Guard: cannot return more than sent - already returned
  IF (v_quantity_returned + p_quantity) > v_quantity_sent THEN
    RAISE EXCEPTION 'Return quantity exceeds sent quantity. Sent: %, Already returned: %, Requested: %',
      v_quantity_sent, v_quantity_returned, p_quantity;
  END IF;

  -- Update quantity_returned
  UPDATE public.consignment_items
  SET quantity_returned = quantity_returned + p_quantity
  WHERE id = p_item_id;

  -- Record return movement and update stock
  INSERT INTO public.stock_movements (product_id, user_id, movement_type, quantity, notes)
  VALUES (v_product_id, p_user_id, 'return', p_quantity, 'Retorno de consignação: ' || p_item_id);

  UPDATE public.products
  SET current_stock = current_stock + p_quantity
  WHERE id = v_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.rpc_return_consignment_item IS
  'Handles returns from consignment stores: increments returned quantity and restores stock.';

-- ---------------------------------------------------------------
-- rpc_generate_weekly_closing: Admin-triggered closing generation.
-- Aggregates sold items per store for a given week.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_generate_weekly_closing(
  p_week_reference DATE
)
RETURNS INTEGER AS $$
DECLARE
  v_record RECORD;
  v_inserted INTEGER := 0;
BEGIN
  -- Loop through each open consignment with sold items in the period
  FOR v_record IN
    SELECT
      c.id AS consignment_id,
      c.store_name,
      SUM(ci.quantity_sold * ci.unit_price) AS amount_due
    FROM public.consignments c
    JOIN public.consignment_items ci ON ci.consignment_id = c.id
    WHERE
      c.status = 'open'
      AND ci.quantity_sold > 0
      -- Include consignments sent up to the week reference date
      AND c.sent_at::DATE <= p_week_reference
    GROUP BY c.id, c.store_name
    HAVING SUM(ci.quantity_sold * ci.unit_price) > 0
  LOOP
    -- Skip if closing already exists for this store + week
    IF EXISTS (
      SELECT 1 FROM public.weekly_closing
      WHERE consignment_id = v_record.consignment_id
        AND week_reference = p_week_reference
    ) THEN
      CONTINUE;
    END IF;

    INSERT INTO public.weekly_closing (consignment_id, store_name, amount_due, week_reference)
    VALUES (v_record.consignment_id, v_record.store_name, v_record.amount_due, p_week_reference);

    v_inserted := v_inserted + 1;
  END LOOP;

  RETURN v_inserted; -- Returns number of closing records inserted
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.rpc_generate_weekly_closing IS
  'Admin-triggered: generates weekly_closing records for all open consignments with sold items up to the week date.';
