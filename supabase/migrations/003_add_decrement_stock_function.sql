-- Atomic stock decrement: prevents negative stock and eliminates race conditions.
-- Raises an exception if stock < qty so the sale is rolled back cleanly.
CREATE OR REPLACE FUNCTION public.decrement_stock(variant_id uuid, qty integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.product_variants
  SET stock = stock - qty
  WHERE id = variant_id AND stock >= qty;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stock insuficiente para la variante %', variant_id;
  END IF;
END;
$$;
