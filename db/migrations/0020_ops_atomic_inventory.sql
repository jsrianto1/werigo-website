-- Physical allocation and website reservations commit together. No scheduler,
-- HTTP bridge or extra environment secret is needed after migration.
CREATE FUNCTION ops.available_units(wanted_model text,excluded_booking text,finish bigint,beginning bigint)
RETURNS SETOF ops.units LANGUAGE sql STABLE SET search_path=ops,public AS $$
 SELECT u.* FROM ops.units u WHERE u.model=wanted_model AND u.state='ready' AND u.usage='rental'
 AND NOT EXISTS(SELECT 1 FROM ops.rental_records r,ops.json_each(r.unit_ids) j WHERE j.value=u.id AND r.source_status<>'Done' AND r.followup_state<>'returned')
 AND NOT EXISTS(SELECT 1 FROM ops.handovers h WHERE h.unit_id=u.id AND h.kind='out' AND h.booking_id<>excluded_booking AND NOT EXISTS(SELECT 1 FROM ops.handovers i WHERE i.booking_id=h.booking_id AND i.unit_id=h.unit_id AND i.kind='in'))
 AND NOT EXISTS(SELECT 1 FROM ops.bookings b,ops.json_each(b.unit_ids) j WHERE j.value=u.id AND b.id<>excluded_booking AND b.status IN ('pending_payment','confirmed','active') AND (b.status='active' OR (b.start_at<finish+3600000 AND b.end_at+3600000>beginning)))
 ORDER BY u.code
$$;

CREATE FUNCTION ops.sync_website_booking(p_website_id uuid) RETURNS void LANGUAGE plpgsql SET search_path=ops,public AS $$
DECLARE b public.bookings%ROWTYPE; previous ops.bookings%ROWTYPE;
 hold_state text; selected_ids text[]; bid text:='web:'||p_website_id::text; cid text:='web-customer:'||p_website_id::text;
 ts bigint:=floor(extract(epoch FROM clock_timestamp())*1000); start_ms bigint; end_ms bigint; paid_ms bigint; p public.payments%ROWTYPE;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM ops.settings WHERE id=1 AND ready) THEN RETURN; END IF;
 PERFORM pg_advisory_xact_lock(76019);
 SELECT * INTO b FROM public.bookings WHERE id=p_website_id FOR UPDATE;
 IF NOT FOUND THEN RETURN; END IF;
 SELECT * INTO previous FROM ops.bookings WHERE id=bid;
 hold_state:=CASE WHEN b.status::text IN ('cancelled','completed','expired','no_response') OR b.payment_status::text IN ('refunded','failed','expired') THEN 'released'
   WHEN b.payment_status::text='paid' THEN 'paid'
   WHEN b.status::text IN ('confirmed','active') AND b.payment_status::text='unpaid' THEN 'confirmed'
   WHEN b.payment_status::text='pending' THEN 'pending' ELSE 'released' END;
 IF hold_state='released' AND previous.id IS NULL THEN RETURN; END IF;
 start_ms:=floor(extract(epoch FROM b.start_at)*1000);end_ms:=floor(extract(epoch FROM b.end_at)*1000);
 IF hold_state<>'released' THEN
  IF previous.status IN ('active','completed') THEN
   IF previous.start_at<>start_ms OR previous.end_at<>end_ms OR ops.json_array_length(previous.unit_ids)<>b.quantity THEN RAISE EXCEPTION 'ACTIVE_BOOKING_REVIEW' USING ERRCODE='23514';END IF;
   SELECT array_agg(value) INTO selected_ids FROM ops.json_each(previous.unit_ids);
  ELSE
   SELECT array_agg(id ORDER BY retained DESC,code) INTO selected_ids FROM
    (SELECT u.id,u.code,CASE WHEN previous.id IS NOT NULL THEN previous.unit_ids::jsonb ? u.id ELSE false END retained
     FROM ops.available_units(b.vehicle_model::text,bid,end_ms,start_ms) u ORDER BY retained DESC,u.code LIMIT b.quantity) candidates;
   IF coalesce(cardinality(selected_ids),0)<b.quantity THEN RAISE EXCEPTION 'stock_unavailable' USING ERRCODE='23514';END IF;
  END IF;
  INSERT INTO ops.customers(id,name,phone,email,address,created_at,updated_at)
   VALUES(cid,b.full_name,b.whatsapp_number,coalesce(b.email,''),coalesce(b.pickup_address,''),ts,ts)
   ON CONFLICT(id) DO UPDATE SET name=excluded.name,phone=excluded.phone,email=excluded.email,address=excluded.address,updated_at=excluded.updated_at;
  IF previous.id IS NOT NULL THEN
   UPDATE ops.bookings SET unit_ids=to_jsonb(selected_ids)::text,start_at=start_ms,end_at=end_ms,
    status=CASE WHEN previous.status IN ('active','completed') THEN previous.status WHEN b.status::text='active' THEN 'active' WHEN hold_state='pending' THEN 'pending_payment' ELSE 'confirmed' END,
    location=concat_ws(' · ',b.pickup_area,b.pickup_address,'Return: '||b.return_area,b.return_address),
    base_idr=coalesce(b.base_idr,0),discount_idr=b.discount_idr,fee_idr=b.area_fee_idr,updated_at=ts WHERE id=bid;
  ELSE
  INSERT INTO ops.bookings(id,code,customer_id,unit_ids,start_at,end_at,status,source,location,base_idr,discount_idr,fee_idr,notes,pricing_snapshot,created_at,updated_at)
   VALUES(bid,b.booking_code,cid,to_jsonb(selected_ids)::text,start_ms,end_ms,
    CASE WHEN previous.status IN ('active','completed') THEN previous.status WHEN b.status::text='active' THEN 'active' WHEN hold_state='pending' THEN 'pending_payment' ELSE 'confirmed' END,
    'Website',concat_ws(' · ',b.pickup_area,b.pickup_address,'Return: '||b.return_area,b.return_address),coalesce(b.base_idr,0),b.discount_idr,b.area_fee_idr,
    CASE WHEN hold_state='pending' THEN 'Online payment pending. Units held until the payment outcome is verified.' ELSE 'Website reservation. Online payment records are reconciled automatically.' END,
    jsonb_build_object('website_model',b.vehicle_model,'website_booking',b.booking_code,'total',coalesce(b.total_idr,0))::text,ts,ts);
  END IF;
 ELSE
  UPDATE ops.bookings SET status='cancelled',updated_at=ts WHERE id=bid AND status IN ('pending_payment','confirmed','draft')
   AND NOT EXISTS(SELECT 1 FROM ops.handovers WHERE booking_id=bid AND kind='out');
 END IF;
 INSERT INTO ops.website_bookings(website_id,booking_id,revision,payment_state,expires_at,mutation_token,updated_at)
  VALUES(p_website_id::text,bid,1,hold_state,CASE WHEN b.payment_expires_at IS NULL THEN NULL ELSE floor(extract(epoch FROM b.payment_expires_at)*1000) END,gen_random_uuid()::text,ts)
  ON CONFLICT(website_id) DO UPDATE SET revision=ops.website_bookings.revision+1,payment_state=excluded.payment_state,expires_at=excluded.expires_at,updated_at=excluded.updated_at;
 -- Record only verified website payment outcomes, once. No fabricated cash receipts.
 IF b.payment_status::text='paid' AND b.paid_at IS NOT NULL AND b.total_idr>0 THEN
  SELECT * INTO p FROM public.payments WHERE booking_id=p_website_id AND transaction_status IN ('settlement','capture') ORDER BY updated_at DESC LIMIT 1;
  paid_ms:=floor(extract(epoch FROM b.paid_at)*1000);
  INSERT INTO ops.payments(id,request_id,booking_id,kind,amount,method,reference,paid_at,note,actor,created_at)
   SELECT 'web-payment:'||p_website_id::text,'web-payment:'||p_website_id::text,bid,'rental',b.total_idr,coalesce(p.payment_type,'Website'),coalesce(p.transaction_id,p.order_id,b.booking_code),paid_ms,'Verified website payment','website',ts
   WHERE NOT EXISTS(SELECT 1 FROM ops.payments WHERE request_id='web-payment:'||p_website_id::text);
 END IF;

END $$;

CREATE FUNCTION ops.website_booking_changed() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF pg_trigger_depth()<4 THEN PERFORM ops.sync_website_booking(NEW.id); END IF;RETURN NEW;
END $$;
CREATE TRIGGER a_ops_transaction_lock BEFORE INSERT OR UPDATE OR DELETE ON public.bookings FOR EACH STATEMENT EXECUTE FUNCTION ops.write_lock();
CREATE TRIGGER consolidated_ops_insert AFTER INSERT ON public.bookings FOR EACH ROW EXECUTE FUNCTION ops.website_booking_changed();
CREATE TRIGGER consolidated_ops_update AFTER UPDATE OF status,payment_status,payment_expires_at,start_at,end_at,quantity,vehicle_model,total_idr,base_idr,discount_idr,area_fee_idr,full_name,whatsapp_number,pickup_address,return_address ON public.bookings
 FOR EACH ROW WHEN(OLD.* IS DISTINCT FROM NEW.*) EXECUTE FUNCTION ops.website_booking_changed();

CREATE FUNCTION ops.handover_updates_website() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.source='Website' AND OLD.status<>NEW.status AND NEW.status IN ('active','completed') AND pg_trigger_depth()<3 THEN
  UPDATE public.bookings SET status=NEW.status::public.booking_status WHERE id=(SELECT website_id::uuid FROM ops.website_bookings WHERE booking_id=NEW.id)
   AND status::text NOT IN ('cancelled','expired','completed') AND status::text<>NEW.status;
 END IF;RETURN NEW;
END $$;
CREATE TRIGGER consolidated_ops_handover AFTER UPDATE OF status ON ops.bookings FOR EACH ROW EXECUTE FUNCTION ops.handover_updates_website();
DROP TRIGGER IF EXISTS bookings_ops_sync_insert ON public.bookings;
DROP TRIGGER IF EXISTS bookings_ops_sync_update ON public.bookings;
UPDATE public.werigo_ops_sync_settings SET enabled=false,ready=false;
