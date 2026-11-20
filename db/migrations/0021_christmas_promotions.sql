-- Christmas 2026. Dates are booking/checkout dates in Bali, not rental dates.
-- Inclusive 20 Nov through 31 Dec; Jan 1 is the exclusive end.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.promotions WHERE upper(code) IN ('NEWCHRISTMAS','CHRISTMAS26'))
    OR EXISTS (SELECT 1 FROM public.referral_codes WHERE upper(code) IN ('NEWCHRISTMAS','CHRISTMAS26'))
  THEN RAISE EXCEPTION 'Christmas promotion code is already in use'; END IF;
END $$;
ALTER TABLE public.promotions ADD COLUMN returning_booking_only boolean NOT NULL DEFAULT false;
ALTER TABLE public.promotions ADD CONSTRAINT promotions_customer_segment
  CHECK (NOT (first_booking_only AND returning_booking_only));

CREATE FUNCTION public.promotion_has_previous_booking(uid text, excluded uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SET search_path=public,pg_temp AS $$
DECLARE customer_email text;
BEGIN
  IF EXISTS (SELECT 1 FROM public.bookings b WHERE b.user_id=uid
    AND b.id IS DISTINCT FROM excluded AND (
      b.payment_status IN ('paid','refunded') OR b.status IN ('confirmed','active','completed')
    )) THEN RETURN true; END IF;
  -- Only a verified account email can claim a historical staff/import booking.
  SELECT lower(trim(email)) INTO customer_email FROM public."user"
    WHERE id=uid AND "emailVerified" AND trim(email)<>'';
  IF customer_email IS NOT NULL AND to_regclass('ops.bookings') IS NOT NULL THEN
    RETURN EXISTS (SELECT 1 FROM ops.bookings b JOIN ops.customers c ON c.id=b.customer_id
      WHERE lower(trim(c.email))=customer_email AND b.status IN ('confirmed','active','completed')
      AND NOT EXISTS (SELECT 1 FROM ops.website_bookings w
        WHERE w.booking_id=b.id AND w.website_id=excluded::text))
      OR EXISTS (SELECT 1 FROM ops.rental_records r JOIN ops.customers c ON c.id=r.customer_id
        WHERE lower(trim(c.email))=customer_email AND r.source_status IN ('Done','Delivered','Collect'));
  END IF;
  RETURN false;
END $$;

CREATE FUNCTION public.validate_booking_promotion()
RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE promo public.promotions%ROWTYPE; used_total integer; used_by_user integer;
  expected_discount integer;
BEGIN
  IF NEW.promotion_id IS NULL THEN RETURN NEW; END IF;
  -- Do not reprice existing paid bookings or still-valid payment sessions.
  IF TG_OP='UPDATE' THEN
    IF NEW.payment_status<>'pending' OR
      (OLD.payment_status='pending' AND OLD.payment_expires_at>now()) THEN RETURN NEW; END IF;
  END IF;
  -- Inventory mutations take this same lock first. Serialise eligibility and
  -- usage with booking creation rather than trusting the checkout preview.
  PERFORM pg_advisory_xact_lock(76019);
  SELECT * INTO promo FROM public.promotions WHERE id=NEW.promotion_id FOR UPDATE;
  IF NOT FOUND OR NOT promo.active OR NEW.user_id IS NULL
    OR (promo.starts_at IS NOT NULL AND promo.starts_at>now())
    OR (promo.ends_at IS NOT NULL AND promo.ends_at<=now())
    OR NEW.discount_kind IS DISTINCT FROM 'promotion'
    OR NEW.discount_code IS DISTINCT FROM promo.code
    OR (promo.models IS NOT NULL AND NOT (NEW.vehicle_model=ANY(promo.models)))
    OR (promo.min_rental_idr IS NOT NULL AND NEW.base_idr<promo.min_rental_idr)
    OR (promo.audience='assigned' AND NOT EXISTS(SELECT 1 FROM public.voucher_grants
      WHERE promotion_id=promo.id AND user_id=NEW.user_id))
  THEN RAISE EXCEPTION 'Promotion unavailable' USING ERRCODE='P0002'; END IF;
  IF (promo.first_booking_only AND (public.promotion_has_previous_booking(NEW.user_id,NEW.id)
    OR EXISTS (SELECT 1 FROM public.bookings b WHERE b.user_id=NEW.user_id
      AND b.id<>NEW.id AND b.status NOT IN ('cancelled','expired','no_response')
      AND b.payment_status='pending' AND b.payment_expires_at>now())))
    OR (promo.returning_booking_only AND NOT public.promotion_has_previous_booking(NEW.user_id,NEW.id))
  THEN RAISE EXCEPTION 'Promotion customer eligibility changed' USING ERRCODE='P0002'; END IF;
  SELECT count(*)::integer, count(*) FILTER(WHERE b.user_id=NEW.user_id)::integer
    INTO used_total,used_by_user FROM public.bookings b WHERE b.promotion_id=promo.id AND b.id<>NEW.id
    AND (b.payment_status IN ('paid','refunded') OR (b.payment_status='pending' AND b.payment_expires_at>now()));
  IF (promo.usage_limit_total IS NOT NULL AND used_total>=promo.usage_limit_total)
    OR (promo.usage_limit_per_user IS NOT NULL AND used_by_user>=promo.usage_limit_per_user)
  THEN RAISE EXCEPTION 'Promotion usage limit reached' USING ERRCODE='P0002'; END IF;
  expected_discount:=CASE WHEN promo.discount_type='percent'
    THEN round(NEW.base_idr::numeric*promo.discount_value/100)::integer ELSE promo.discount_value END;
  expected_discount:=least(NEW.base_idr,expected_discount,coalesce(promo.max_discount_idr,expected_discount));
  IF NEW.base_idr IS NULL OR NEW.discount_idr IS DISTINCT FROM expected_discount
  THEN RAISE EXCEPTION 'Promotion amount changed' USING ERRCODE='P0002'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER booking_promotion_guard BEFORE INSERT OR UPDATE OF payment_status,payment_expires_at
  ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.validate_booking_promotion();

INSERT INTO public.promotions(code,title,description,audience,discount_type,discount_value,
  first_booking_only,returning_booking_only,starts_at,ends_at,usage_limit_per_user,featured,active)
VALUES
  ('NEWCHRISTMAS','Your first Christmas ride','25% off your first rental. Book 20 Nov–31 Dec 2026 (Bali time). Rental only; one discount per booking.',
   'public','percent',25,true,false,'2026-11-20T00:00:00+08:00','2027-01-01T00:00:00+08:00',1,false,true),
  ('CHRISTMAS26','Back for a Christmas ride','20% off for returning customers with a previous confirmed or paid Werigo booking. Book 20 Nov–31 Dec 2026 (Bali time). Rental only; one discount per booking.',
   'public','percent',20,false,true,'2026-11-20T00:00:00+08:00','2027-01-01T00:00:00+08:00',null,false,true)
;
