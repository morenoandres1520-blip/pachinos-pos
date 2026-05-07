-- Atomic stock increment used when voiding a sale to restore inventory.
CREATE OR REPLACE FUNCTION public.increment_stock(variant_id uuid, qty integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.product_variants
  SET stock = stock + qty
  WHERE id = variant_id;
END;
$$;
