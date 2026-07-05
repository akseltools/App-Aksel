-- =============================================================================
-- AKSEL TOOLS — RLS Policies (Desativado / Liberado para Next.js Backend)
-- Como o Next.js roda no servidor e gerencia toda a segurança e permissões de
-- escrita via Server Actions (cookies seguros iron-session), a segurança no nível
-- do banco (RLS) não precisa usar variáveis de sessão temporárias (que falham
-- no PostgREST devido à arquitetura sem estado / stateless).
-- =============================================================================

-- Desabilita RLS em todas as tabelas para liberar o acesso ao Backend Next.js
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.consignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.consignment_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_closing DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items DISABLE ROW LEVEL SECURITY;

-- Remove políticas antigas para evitar erros de duplicidade
DROP POLICY IF EXISTS "users_select_public" ON public.users;
DROP POLICY IF EXISTS "users_insert_admin" ON public.users;
DROP POLICY IF EXISTS "users_update" ON public.users;
DROP POLICY IF EXISTS "users_delete_admin" ON public.users;

DROP POLICY IF EXISTS "products_select_authenticated" ON public.products;
DROP POLICY IF EXISTS "products_select_public" ON public.products;
DROP POLICY IF EXISTS "products_insert_admin" ON public.products;
DROP POLICY IF EXISTS "products_update_admin" ON public.products;
DROP POLICY IF EXISTS "products_delete_admin" ON public.products;

DROP POLICY IF EXISTS "movements_select_authenticated" ON public.stock_movements;
DROP POLICY IF EXISTS "movements_select_public" ON public.stock_movements;
DROP POLICY IF EXISTS "movements_insert_authenticated" ON public.stock_movements;

DROP POLICY IF EXISTS "consignments_select_authenticated" ON public.consignments;
DROP POLICY IF EXISTS "consignments_select_public" ON public.consignments;
DROP POLICY IF EXISTS "consignments_insert_authenticated" ON public.consignments;
DROP POLICY IF EXISTS "consignments_update_authenticated" ON public.consignments;

DROP POLICY IF EXISTS "consignment_items_select_authenticated" ON public.consignment_items;
DROP POLICY IF EXISTS "consignment_items_select_public" ON public.consignment_items;
DROP POLICY IF EXISTS "consignment_items_insert_authenticated" ON public.consignment_items;
DROP POLICY IF EXISTS "consignment_items_update_authenticated" ON public.consignment_items;

DROP POLICY IF EXISTS "closing_select_authenticated" ON public.weekly_closing;
DROP POLICY IF EXISTS "closing_select_public" ON public.weekly_closing;
DROP POLICY IF EXISTS "closing_insert_admin" ON public.weekly_closing;
DROP POLICY IF EXISTS "closing_update_admin" ON public.weekly_closing;

DROP POLICY IF EXISTS "sales_select_authenticated" ON public.sales;
DROP POLICY IF EXISTS "sales_select_public" ON public.sales;
DROP POLICY IF EXISTS "sales_insert_authenticated" ON public.sales;

DROP POLICY IF EXISTS "sale_items_select_authenticated" ON public.sale_items;
DROP POLICY IF EXISTS "sale_items_select_public" ON public.sale_items;
DROP POLICY IF EXISTS "sale_items_insert_authenticated" ON public.sale_items;
