-- Replace FK columns with denormalized text columns on products.
-- The categories/brands tables remain as option lists for dropdowns.
ALTER TABLE public.products
  DROP COLUMN IF EXISTS category_id,
  DROP COLUMN IF EXISTS brand_id,
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS brand text;
