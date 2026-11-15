-- Consolidated Ops lives in its own schema on the existing PostgreSQL.

CREATE SCHEMA ops;

SET LOCAL search_path=ops,public;

CREATE FUNCTION ops.json_each(input text) RETURNS TABLE(value text) LANGUAGE sql IMMUTABLE AS $$ SELECT jsonb_array_elements_text(input::jsonb) $$;
CREATE FUNCTION ops.json_valid(input text) RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$ BEGIN PERFORM input::jsonb; RETURN true; EXCEPTION WHEN others THEN RETURN false; END $$;
CREATE FUNCTION ops.json_array_length(input text) RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT jsonb_array_length(input::jsonb) $$;
CREATE FUNCTION ops.json_extract(input text,path text) RETURNS bigint LANGUAGE sql IMMUTABLE AS $$ SELECT (input::jsonb->>substring(path FROM 3))::bigint $$;

CREATE TABLE "audit" (
	"id" text PRIMARY KEY NOT NULL,
	"action" text NOT NULL,
	"entity_id" text NOT NULL,
	"detail" text NOT NULL,
	"actor" text NOT NULL,
	"created_at" bigint NOT NULL
);

CREATE TABLE "bookings" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"customer_id" text NOT NULL,
	"unit_ids" text NOT NULL,
	"start_at" bigint NOT NULL,
	"end_at" bigint NOT NULL,
	"status" text NOT NULL,
	"source" text NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"pic" text DEFAULT '' NOT NULL,
	"base_idr" bigint NOT NULL,
	"discount_idr" bigint DEFAULT 0 NOT NULL,
	"fee_idr" bigint DEFAULT 0 NOT NULL,
	"discount_reason" text DEFAULT '' NOT NULL,
	"discount_approver" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"pricing_snapshot" text NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);

CREATE TABLE "customers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"nationality" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"identity_checked" bigint DEFAULT 0 NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);

CREATE TABLE "feedback" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"booking_id" text,
	"rating" bigint,
	"message" text NOT NULL,
	"channel" text NOT NULL,
	"followup" text DEFAULT '' NOT NULL,
	"actor" text NOT NULL,
	"created_at" bigint NOT NULL
);

CREATE TABLE "files" (
	"id" text PRIMARY KEY NOT NULL,
	"storage_key" text NOT NULL,
	"mime" text NOT NULL,
	"name" text NOT NULL,
	"size" bigint NOT NULL,
	"actor" text NOT NULL,
	"created_at" bigint NOT NULL
);

CREATE TABLE "handovers" (
	"id" text PRIMARY KEY NOT NULL,
	"booking_id" text NOT NULL,
	"kind" text NOT NULL,
	"unit_id" text NOT NULL,
	"battery" bigint NOT NULL,
	"odometer" bigint NOT NULL,
	"checklist" text NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"photos" text NOT NULL,
	"signature_id" text NOT NULL,
	"signer" text NOT NULL,
	"summary" text NOT NULL,
	"actual_at" bigint NOT NULL,
	"actor" text NOT NULL,
	"created_at" bigint NOT NULL
);

CREATE TABLE "note_updates" (
	"id" text PRIMARY KEY NOT NULL,
	"note_id" text NOT NULL,
	"body" text NOT NULL,
	"status" text NOT NULL,
	"actor" text NOT NULL,
	"created_at" bigint NOT NULL
);

CREATE TABLE "notes" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"kind" text NOT NULL,
	"priority" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"booking_id" text,
	"unit_id" text,
	"customer_id" text,
	"body" text NOT NULL,
	"assignee" text DEFAULT '' NOT NULL,
	"photos" text DEFAULT '[]' NOT NULL,
	"actor" text NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL, "rental_id" text
);

CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"request_id" text NOT NULL,
	"booking_id" text NOT NULL,
	"kind" text NOT NULL,
	"amount" bigint NOT NULL,
	"method" text NOT NULL,
	"reference" text DEFAULT '' NOT NULL,
	"paid_at" bigint NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"file_id" text,
	"actor" text NOT NULL,
	"created_at" bigint NOT NULL, "extension_id" text
);

CREATE TABLE "promotions" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"code" text DEFAULT '' NOT NULL,
	"type" text NOT NULL,
	"value" bigint NOT NULL,
	"starts_at" bigint NOT NULL,
	"ends_at" bigint NOT NULL,
	"terms" text NOT NULL,
	"approver" text NOT NULL,
	"enabled" bigint DEFAULT 1 NOT NULL,
	"created_at" bigint NOT NULL
);

CREATE TABLE "staff" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"enabled" bigint DEFAULT 1 NOT NULL,
	"created_at" bigint NOT NULL
, "reminder_reads" text DEFAULT '[]' NOT NULL);

CREATE TABLE "units" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"plate" text DEFAULT '' NOT NULL,
	"model" text NOT NULL,
	"color" text DEFAULT '' NOT NULL,
	"vin" text DEFAULT '' NOT NULL,
	"location" text DEFAULT 'Showroom' NOT NULL,
	"state" text DEFAULT 'ready' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
, "engine_number" text, "usage" text, "source_ref" text);

CREATE TABLE "sales_records" (
	"id" text PRIMARY KEY NOT NULL,
	"source_file" text NOT NULL,
	"source_sha" text NOT NULL,
	"source_sheet" text NOT NULL,
	"source_row" bigint NOT NULL,
	"snapshot_date" text NOT NULL,
	"category" text NOT NULL,
	"customer_name" text DEFAULT '' NOT NULL,
	"sales" text DEFAULT '' NOT NULL,
	"model" text NOT NULL,
	"color" text DEFAULT '' NOT NULL,
	"vin" text DEFAULT '' NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"amount_idr" bigint NOT NULL,
	"source_data" text NOT NULL,
	"flags" text NOT NULL,
	"followup_state" text DEFAULT 'open' NOT NULL,
	"followup_note" text DEFAULT '' NOT NULL,
	"updated_at" bigint NOT NULL,
	"created_at" bigint NOT NULL
);

CREATE TABLE "auth_accounts" (
	"staff_id" text PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"updated_at" bigint NOT NULL
);

CREATE TABLE "auth_limits" (
	"id" text PRIMARY KEY NOT NULL,
	"attempts" bigint NOT NULL,
	"expires_at" bigint NOT NULL
);

CREATE TABLE "auth_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"staff_id" text NOT NULL,
	"created_at" bigint NOT NULL,
	"last_seen_at" bigint NOT NULL,
	"expires_at" bigint NOT NULL
);

CREATE TABLE "rental_records" (
	"id" text PRIMARY KEY NOT NULL,
	"source_id" text NOT NULL,
	"source_row" bigint NOT NULL,
	"customer_id" text NOT NULL,
	"customer_name" text NOT NULL,
	"unit_ids" text NOT NULL,
	"model" text NOT NULL,
	"color" text NOT NULL,
	"vin" text NOT NULL,
	"engine_number" text NOT NULL,
	"quantity" bigint NOT NULL,
	"days" bigint NOT NULL,
	"daily_rate" bigint NOT NULL,
	"revenue" bigint NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"source_status" text NOT NULL,
	"sales" text NOT NULL,
	"delivery" text NOT NULL,
	"lead_source" text NOT NULL,
	"payment_scheme" text NOT NULL,
	"flags" text NOT NULL,
	"finance_ids" text NOT NULL,
	"source_data" text NOT NULL,
	"followup_state" text NOT NULL,
	"followup_note" text NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL, "review_notes" text, "operational_end_date" text, "returned_at" bigint, "return_condition" text, "extension_idr" bigint DEFAULT 0 NOT NULL
);

CREATE TABLE "source_imports" (
	"id" text PRIMARY KEY NOT NULL,
	"source_id" text NOT NULL,
	"source_hash" text NOT NULL,
	"read_date" text NOT NULL,
	"summary" text NOT NULL,
	"actor" text NOT NULL,
	"created_at" bigint NOT NULL
);

CREATE TABLE "auth_invites" (
	"id" text PRIMARY KEY NOT NULL,
	"staff_id" text NOT NULL,
	"created_at" bigint NOT NULL,
	"expires_at" bigint NOT NULL,
	"used_at" bigint,
	"claim" text
);

CREATE TABLE "rental_events" (
	"id" text PRIMARY KEY NOT NULL,
	"rental_id" text NOT NULL,
	"kind" text NOT NULL,
	"detail" text NOT NULL,
	"actor" text NOT NULL,
	"created_at" bigint NOT NULL
);

CREATE TABLE "rental_extensions" (
	"id" text PRIMARY KEY NOT NULL,
	"rental_id" text,
	"booking_id" text,
	"amount" bigint NOT NULL,
	"old_end" text NOT NULL,
	"new_end" text NOT NULL,
	"note" text NOT NULL,
	"paid_at" bigint,
	"method" text DEFAULT '' NOT NULL,
	"reference" text DEFAULT '' NOT NULL,
	"actor" text NOT NULL,
	"paid_by" text,
	"created_at" bigint NOT NULL
);

CREATE TABLE "website_bookings" (
	"website_id" text PRIMARY KEY NOT NULL,
	"booking_id" text NOT NULL,
	"revision" bigint NOT NULL,
	"payment_state" text NOT NULL,
	"expires_at" bigint,
	"mutation_token" text NOT NULL,
	"updated_at" bigint NOT NULL
);

CREATE TABLE "website_status_events" (
	"sequence" bigserial PRIMARY KEY NOT NULL,
	"website_id" text NOT NULL,
	"status" text NOT NULL,
	"created_at" bigint NOT NULL
);

CREATE TABLE "website_sync_health" (
	"id" bigint PRIMARY KEY NOT NULL,
	"last_attempt_at" bigint NOT NULL,
	"last_success_at" bigint,
	"last_cron_at" bigint,
	"last_error" text,
	"last_reason" text NOT NULL
);

ALTER TABLE ops."bookings" ADD FOREIGN KEY("customer_id") REFERENCES ops."customers"("id") DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE ops."feedback" ADD FOREIGN KEY("customer_id") REFERENCES ops."customers"("id") DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE ops."feedback" ADD FOREIGN KEY("booking_id") REFERENCES ops."bookings"("id") DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE ops."handovers" ADD FOREIGN KEY("booking_id") REFERENCES ops."bookings"("id") DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE ops."handovers" ADD FOREIGN KEY("unit_id") REFERENCES ops."units"("id") DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE ops."note_updates" ADD FOREIGN KEY("note_id") REFERENCES ops."notes"("id") DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE ops."notes" ADD FOREIGN KEY("booking_id") REFERENCES ops."bookings"("id") DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE ops."notes" ADD FOREIGN KEY("unit_id") REFERENCES ops."units"("id") DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE ops."notes" ADD FOREIGN KEY("customer_id") REFERENCES ops."customers"("id") DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE ops."notes" ADD FOREIGN KEY("rental_id") REFERENCES ops."rental_records"("id") DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE ops."payments" ADD FOREIGN KEY("booking_id") REFERENCES ops."bookings"("id") DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE ops."payments" ADD FOREIGN KEY("extension_id") REFERENCES ops."rental_extensions"("id") DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE ops."auth_accounts" ADD FOREIGN KEY("staff_id") REFERENCES ops."staff"("id") DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE ops."auth_sessions" ADD FOREIGN KEY("staff_id") REFERENCES ops."staff"("id") DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE ops."rental_records" ADD FOREIGN KEY("customer_id") REFERENCES ops."customers"("id") DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE ops."auth_invites" ADD FOREIGN KEY("staff_id") REFERENCES ops."staff"("id") DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE ops."rental_events" ADD FOREIGN KEY("rental_id") REFERENCES ops."rental_records"("id") DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE ops."rental_extensions" ADD FOREIGN KEY("rental_id") REFERENCES ops."rental_records"("id") DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE ops."rental_extensions" ADD FOREIGN KEY("booking_id") REFERENCES ops."bookings"("id") DEFERRABLE INITIALLY DEFERRED;

CREATE UNIQUE INDEX "bookings_code_unique" ON "bookings" ("code");

CREATE UNIQUE INDEX "handover_once" ON "handovers" ("booking_id","kind","unit_id");

CREATE UNIQUE INDEX "payments_request_id_unique" ON "payments" ("request_id");

CREATE UNIQUE INDEX "staff_email_unique" ON "staff" ("email");

CREATE UNIQUE INDEX "units_code_unique" ON "units" ("code");

CREATE UNIQUE INDEX unit_plate_unique ON units(plate) WHERE plate <> '';

CREATE INDEX booking_period_idx ON bookings(status,start_at,end_at);

CREATE INDEX payment_booking_idx ON payments(booking_id);

CREATE UNIQUE INDEX "sales_source_row" ON "sales_records" ("snapshot_date","source_sheet","source_row");

CREATE UNIQUE INDEX "auth_accounts_username_unique" ON "auth_accounts" ("username");

CREATE UNIQUE INDEX "source_imports_source_id_unique" ON "source_imports" ("source_id");

CREATE INDEX rental_source_unit_lookup ON rental_records(source_status,followup_state);

CREATE UNIQUE INDEX "payments_extension_id_unique" ON "payments" ("extension_id");

CREATE UNIQUE INDEX "website_bookings_booking_id_unique" ON "website_bookings" ("booking_id");

CREATE TABLE ops.settings(id integer PRIMARY KEY CHECK(id=1),ready boolean NOT NULL DEFAULT false,migrated_at timestamptz,source_counts jsonb NOT NULL DEFAULT '{}'::jsonb); INSERT INTO ops.settings(id) VALUES(1);

CREATE TABLE ops.file_contents(file_id text PRIMARY KEY REFERENCES ops.files(id),content bytea NOT NULL);

CREATE FUNCTION ops.write_lock() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_advisory_xact_lock(76019); RETURN NULL; END $$;

CREATE TRIGGER a_transaction_lock BEFORE INSERT OR UPDATE OR DELETE ON ops."audit" FOR EACH STATEMENT EXECUTE FUNCTION ops.write_lock();

CREATE TRIGGER a_transaction_lock BEFORE INSERT OR UPDATE OR DELETE ON ops."bookings" FOR EACH STATEMENT EXECUTE FUNCTION ops.write_lock();

CREATE TRIGGER a_transaction_lock BEFORE INSERT OR UPDATE OR DELETE ON ops."customers" FOR EACH STATEMENT EXECUTE FUNCTION ops.write_lock();

CREATE TRIGGER a_transaction_lock BEFORE INSERT OR UPDATE OR DELETE ON ops."feedback" FOR EACH STATEMENT EXECUTE FUNCTION ops.write_lock();

CREATE TRIGGER a_transaction_lock BEFORE INSERT OR UPDATE OR DELETE ON ops."files" FOR EACH STATEMENT EXECUTE FUNCTION ops.write_lock();

CREATE TRIGGER a_transaction_lock BEFORE INSERT OR UPDATE OR DELETE ON ops."handovers" FOR EACH STATEMENT EXECUTE FUNCTION ops.write_lock();

CREATE TRIGGER a_transaction_lock BEFORE INSERT OR UPDATE OR DELETE ON ops."note_updates" FOR EACH STATEMENT EXECUTE FUNCTION ops.write_lock();

CREATE TRIGGER a_transaction_lock BEFORE INSERT OR UPDATE OR DELETE ON ops."notes" FOR EACH STATEMENT EXECUTE FUNCTION ops.write_lock();

CREATE TRIGGER a_transaction_lock BEFORE INSERT OR UPDATE OR DELETE ON ops."payments" FOR EACH STATEMENT EXECUTE FUNCTION ops.write_lock();

CREATE TRIGGER a_transaction_lock BEFORE INSERT OR UPDATE OR DELETE ON ops."promotions" FOR EACH STATEMENT EXECUTE FUNCTION ops.write_lock();

CREATE TRIGGER a_transaction_lock BEFORE INSERT OR UPDATE OR DELETE ON ops."staff" FOR EACH STATEMENT EXECUTE FUNCTION ops.write_lock();

CREATE TRIGGER a_transaction_lock BEFORE INSERT OR UPDATE OR DELETE ON ops."units" FOR EACH STATEMENT EXECUTE FUNCTION ops.write_lock();

CREATE TRIGGER a_transaction_lock BEFORE INSERT OR UPDATE OR DELETE ON ops."sales_records" FOR EACH STATEMENT EXECUTE FUNCTION ops.write_lock();

CREATE TRIGGER a_transaction_lock BEFORE INSERT OR UPDATE OR DELETE ON ops."auth_accounts" FOR EACH STATEMENT EXECUTE FUNCTION ops.write_lock();

CREATE TRIGGER a_transaction_lock BEFORE INSERT OR UPDATE OR DELETE ON ops."auth_limits" FOR EACH STATEMENT EXECUTE FUNCTION ops.write_lock();

CREATE TRIGGER a_transaction_lock BEFORE INSERT OR UPDATE OR DELETE ON ops."auth_sessions" FOR EACH STATEMENT EXECUTE FUNCTION ops.write_lock();

CREATE TRIGGER a_transaction_lock BEFORE INSERT OR UPDATE OR DELETE ON ops."rental_records" FOR EACH STATEMENT EXECUTE FUNCTION ops.write_lock();

CREATE TRIGGER a_transaction_lock BEFORE INSERT OR UPDATE OR DELETE ON ops."source_imports" FOR EACH STATEMENT EXECUTE FUNCTION ops.write_lock();

CREATE TRIGGER a_transaction_lock BEFORE INSERT OR UPDATE OR DELETE ON ops."auth_invites" FOR EACH STATEMENT EXECUTE FUNCTION ops.write_lock();

CREATE TRIGGER a_transaction_lock BEFORE INSERT OR UPDATE OR DELETE ON ops."rental_events" FOR EACH STATEMENT EXECUTE FUNCTION ops.write_lock();

CREATE TRIGGER a_transaction_lock BEFORE INSERT OR UPDATE OR DELETE ON ops."rental_extensions" FOR EACH STATEMENT EXECUTE FUNCTION ops.write_lock();

CREATE TRIGGER a_transaction_lock BEFORE INSERT OR UPDATE OR DELETE ON ops."website_bookings" FOR EACH STATEMENT EXECUTE FUNCTION ops.write_lock();

CREATE TRIGGER a_transaction_lock BEFORE INSERT OR UPDATE OR DELETE ON ops."website_status_events" FOR EACH STATEMENT EXECUTE FUNCTION ops.write_lock();

CREATE TRIGGER a_transaction_lock BEFORE INSERT OR UPDATE OR DELETE ON ops."website_sync_health" FOR EACH STATEMENT EXECUTE FUNCTION ops.write_lock();

CREATE FUNCTION ops.payment_balance_guard_fn() RETURNS trigger LANGUAGE plpgsql SET search_path=ops,public AS $$ BEGIN
IF NEW.amount<=0 THEN RAISE EXCEPTION 'BALANCE_LIMIT' USING ERRCODE='23514'; END IF;
 IF NEW.kind='refund' AND NEW.amount>coalesce((SELECT sum(CASE kind WHEN 'rental' THEN amount WHEN 'refund' THEN -amount ELSE 0 END) FROM payments WHERE booking_id=NEW.booking_id),0) THEN RAISE EXCEPTION 'BALANCE_LIMIT' USING ERRCODE='23514'; END IF;
 IF NEW.kind='deposit_refund' AND NEW.amount>coalesce((SELECT sum(CASE kind WHEN 'deposit' THEN amount WHEN 'deposit_refund' THEN -amount ELSE 0 END) FROM payments WHERE booking_id=NEW.booking_id),0) THEN RAISE EXCEPTION 'BALANCE_LIMIT' USING ERRCODE='23514'; END IF;
 IF NEW.kind='rental' AND NEW.amount+coalesce((SELECT sum(CASE kind WHEN 'rental' THEN amount WHEN 'refund' THEN -amount ELSE 0 END) FROM payments WHERE booking_id=NEW.booking_id),0)>(SELECT base_idr-discount_idr+fee_idr FROM bookings WHERE id=NEW.booking_id) THEN RAISE EXCEPTION 'BALANCE_LIMIT' USING ERRCODE='23514'; END IF;
RETURN NEW;
END $$;

CREATE TRIGGER payment_balance_guard BEFORE INSERT ON ops.payments FOR EACH ROW EXECUTE FUNCTION ops.payment_balance_guard_fn();

CREATE FUNCTION ops.handover_guard_fn() RETURNS trigger LANGUAGE plpgsql SET search_path=ops,public AS $$ BEGIN
IF NOT EXISTS(SELECT 1 FROM bookings b,json_each(b.unit_ids) j WHERE b.id=NEW.booking_id AND j.value=NEW.unit_id) THEN RAISE EXCEPTION 'INVALID_UNIT' USING ERRCODE='23514'; END IF;
 IF NEW.kind='out' AND (SELECT status FROM bookings WHERE id=NEW.booking_id) NOT IN ('confirmed','active') THEN RAISE EXCEPTION 'INVALID_STATUS' USING ERRCODE='23514'; END IF;
 IF NEW.kind='out' AND (SELECT state FROM units WHERE id=NEW.unit_id)<>'ready' THEN RAISE EXCEPTION 'UNIT_NOT_READY' USING ERRCODE='23514'; END IF;
 IF NEW.kind='out' AND EXISTS(SELECT 1 FROM handovers h WHERE h.kind='out' AND h.unit_id=NEW.unit_id AND NOT EXISTS(SELECT 1 FROM handovers r WHERE r.booking_id=h.booking_id AND r.unit_id=h.unit_id AND r.kind='in')) THEN RAISE EXCEPTION 'ACTIVE_UNIT' USING ERRCODE='23514'; END IF;
 IF NEW.kind='in' AND NOT EXISTS(SELECT 1 FROM handovers h WHERE h.booking_id=NEW.booking_id AND h.unit_id=NEW.unit_id AND h.kind='out' AND h.actual_at<=NEW.actual_at AND h.odometer<=NEW.odometer) THEN RAISE EXCEPTION 'INVALID_RETURN' USING ERRCODE='23514'; END IF;
RETURN NEW;
END $$;

CREATE TRIGGER handover_guard BEFORE INSERT ON ops.handovers FOR EACH ROW EXECUTE FUNCTION ops.handover_guard_fn();

CREATE FUNCTION ops.signed_handover_immutable_fn() RETURNS trigger LANGUAGE plpgsql SET search_path=ops,public AS $$ BEGIN
RAISE EXCEPTION 'IMMUTABLE_EVIDENCE' USING ERRCODE='23514';
RETURN NEW;
END $$;

CREATE TRIGGER signed_handover_immutable BEFORE UPDATE ON ops.handovers FOR EACH ROW EXECUTE FUNCTION ops.signed_handover_immutable_fn();

CREATE FUNCTION ops.signed_handover_nodelete_fn() RETURNS trigger LANGUAGE plpgsql SET search_path=ops,public AS $$ BEGIN
RAISE EXCEPTION 'IMMUTABLE_EVIDENCE' USING ERRCODE='23514';
RETURN OLD;
END $$;

CREATE TRIGGER signed_handover_nodelete BEFORE DELETE ON ops.handovers FOR EACH ROW EXECUTE FUNCTION ops.signed_handover_nodelete_fn();

CREATE FUNCTION ops.payment_immutable_fn() RETURNS trigger LANGUAGE plpgsql SET search_path=ops,public AS $$ BEGIN
RAISE EXCEPTION 'IMMUTABLE_LEDGER' USING ERRCODE='23514';
RETURN NEW;
END $$;

CREATE TRIGGER payment_immutable BEFORE UPDATE ON ops.payments FOR EACH ROW EXECUTE FUNCTION ops.payment_immutable_fn();

CREATE FUNCTION ops.payment_nodelete_fn() RETURNS trigger LANGUAGE plpgsql SET search_path=ops,public AS $$ BEGIN
RAISE EXCEPTION 'IMMUTABLE_LEDGER' USING ERRCODE='23514';
RETURN OLD;
END $$;

CREATE TRIGGER payment_nodelete BEFORE DELETE ON ops.payments FOR EACH ROW EXECUTE FUNCTION ops.payment_nodelete_fn();

CREATE FUNCTION ops.handover_snapshot_guard_fn() RETURNS trigger LANGUAGE plpgsql SET search_path=ops,public AS $$ BEGIN
IF json_extract(NEW.summary,'$.end_at') IS DISTINCT FROM (SELECT end_at FROM bookings WHERE id=NEW.booking_id) OR json_extract(NEW.summary,'$.start_at') IS DISTINCT FROM (SELECT start_at FROM bookings WHERE id=NEW.booking_id) OR json_extract(NEW.summary,'$.total_idr') IS DISTINCT FROM (SELECT base_idr-discount_idr+fee_idr FROM bookings WHERE id=NEW.booking_id) THEN RAISE EXCEPTION 'STALE_BOOKING' USING ERRCODE='23514'; END IF;
 IF NEW.kind='out' AND (NEW.actual_at<(SELECT start_at FROM bookings WHERE id=NEW.booking_id) OR NEW.actual_at>=(SELECT end_at FROM bookings WHERE id=NEW.booking_id)) THEN RAISE EXCEPTION 'INVALID_STATUS' USING ERRCODE='23514'; END IF;
RETURN NEW;
END $$;

CREATE TRIGGER handover_snapshot_guard BEFORE INSERT ON ops.handovers FOR EACH ROW EXECUTE FUNCTION ops.handover_snapshot_guard_fn();

CREATE FUNCTION ops.source_rental_handover_fn() RETURNS trigger LANGUAGE plpgsql SET search_path=ops,public AS $$ BEGIN
IF NEW.kind='out' THEN
IF EXISTS(SELECT 1 FROM units WHERE id=NEW.unit_id AND usage IN ('sold','internal')) OR EXISTS(SELECT 1 FROM rental_records r,json_each(r.unit_ids) j WHERE j.value=NEW.unit_id AND r.source_status<>'Done' AND r.followup_state<>'returned') THEN RAISE EXCEPTION 'SOURCE_RENTAL_OPEN' USING ERRCODE='23514'; END IF;
END IF;
RETURN NEW;
END $$;

CREATE TRIGGER source_rental_handover BEFORE INSERT ON ops.handovers FOR EACH ROW EXECUTE FUNCTION ops.source_rental_handover_fn();

CREATE FUNCTION ops.extension_insert_guard_fn() RETURNS trigger LANGUAGE plpgsql SET search_path=ops,public AS $$ BEGIN
IF NEW.amount<=0 OR (NEW.rental_id IS NULL)=(NEW.booking_id IS NULL) OR (NEW.paid_at IS NOT NULL AND (NEW.method='' OR NEW.paid_by IS NULL)) THEN RAISE EXCEPTION 'INVALID_EXTENSION' USING ERRCODE='23514'; END IF;
RETURN NEW;
END $$;

CREATE TRIGGER extension_insert_guard BEFORE INSERT ON ops.rental_extensions FOR EACH ROW EXECUTE FUNCTION ops.extension_insert_guard_fn();

CREATE FUNCTION ops.extension_update_guard_fn() RETURNS trigger LANGUAGE plpgsql SET search_path=ops,public AS $$ BEGIN
IF OLD.paid_at IS NOT NULL OR NEW.id!=OLD.id OR NEW.amount!=OLD.amount OR NEW.rental_id IS DISTINCT FROM OLD.rental_id OR NEW.booking_id IS DISTINCT FROM OLD.booking_id OR NEW.old_end!=OLD.old_end OR NEW.new_end!=OLD.new_end OR NEW.note!=OLD.note OR NEW.created_at!=OLD.created_at OR NEW.actor!=OLD.actor OR NEW.paid_at IS NULL OR NEW.method='' OR NEW.paid_by IS NULL THEN RAISE EXCEPTION 'IMMUTABLE_EXTENSION' USING ERRCODE='23514'; END IF;
RETURN NEW;
END $$;

CREATE TRIGGER extension_update_guard BEFORE UPDATE ON ops.rental_extensions FOR EACH ROW EXECUTE FUNCTION ops.extension_update_guard_fn();

CREATE FUNCTION ops.extension_nodelete_fn() RETURNS trigger LANGUAGE plpgsql SET search_path=ops,public AS $$ BEGIN
RAISE EXCEPTION 'IMMUTABLE_EXTENSION' USING ERRCODE='23514';
RETURN OLD;
END $$;

CREATE TRIGGER extension_nodelete BEFORE DELETE ON ops.rental_extensions FOR EACH ROW EXECUTE FUNCTION ops.extension_nodelete_fn();

CREATE FUNCTION ops.payment_base_rental_guard_fn() RETURNS trigger LANGUAGE plpgsql SET search_path=ops,public AS $$ BEGIN
IF NEW.kind='rental' AND NEW.extension_id IS NULL THEN
IF NEW.amount+COALESCE((SELECT SUM(CASE WHEN kind='rental' THEN amount WHEN kind='refund' THEN -amount ELSE 0 END) FROM payments WHERE booking_id=NEW.booking_id AND extension_id IS NULL),0)>(SELECT base_idr-discount_idr+fee_idr FROM bookings WHERE id=NEW.booking_id)-COALESCE((SELECT SUM(amount) FROM rental_extensions WHERE booking_id=NEW.booking_id),0) THEN RAISE EXCEPTION 'BALANCE_LIMIT' USING ERRCODE='23514'; END IF;
END IF;
RETURN NEW;
END $$;

CREATE TRIGGER payment_base_rental_guard BEFORE INSERT ON ops.payments FOR EACH ROW EXECUTE FUNCTION ops.payment_base_rental_guard_fn();

CREATE FUNCTION ops.booking_insert_guard_fn() RETURNS trigger LANGUAGE plpgsql SET search_path=ops,public AS $$ BEGIN
IF NEW.end_at<=NEW.start_at OR NOT json_valid(NEW.unit_ids) OR json_array_length(NEW.unit_ids)<1 THEN RAISE EXCEPTION 'INVALID_BOOKING' USING ERRCODE='23514'; END IF;
 IF NEW.status IN ('pending_payment','confirmed','active') AND EXISTS(SELECT 1 FROM json_each(NEW.unit_ids) j LEFT JOIN units u ON u.id=j.value WHERE u.id IS NULL OR u.state<>'ready') THEN RAISE EXCEPTION 'UNIT_NOT_READY' USING ERRCODE='23514'; END IF;
 IF NEW.status IN ('pending_payment','confirmed','active') AND EXISTS(SELECT 1 FROM bookings b,json_each(b.unit_ids) old_unit,json_each(NEW.unit_ids) new_unit WHERE b.status IN ('pending_payment','confirmed','active') AND old_unit.value=new_unit.value AND b.start_at<NEW.end_at+3600000 AND b.end_at+3600000>NEW.start_at) THEN RAISE EXCEPTION 'BOOKING_CONFLICT' USING ERRCODE='23514'; END IF;
 IF NEW.status IN ('pending_payment','confirmed','active') AND EXISTS(SELECT 1 FROM handovers h,json_each(NEW.unit_ids) j WHERE h.kind='out' AND h.unit_id=j.value AND NOT EXISTS(SELECT 1 FROM handovers r WHERE r.booking_id=h.booking_id AND r.unit_id=h.unit_id AND r.kind='in')) THEN RAISE EXCEPTION 'ACTIVE_UNIT' USING ERRCODE='23514'; END IF;
RETURN NEW;
END $$;

CREATE TRIGGER booking_insert_guard BEFORE INSERT ON ops.bookings FOR EACH ROW EXECUTE FUNCTION ops.booking_insert_guard_fn();

CREATE FUNCTION ops.booking_update_guard_fn() RETURNS trigger LANGUAGE plpgsql SET search_path=ops,public AS $$ BEGIN
IF NEW.end_at<=NEW.start_at THEN RAISE EXCEPTION 'INVALID_BOOKING' USING ERRCODE='23514'; END IF;
 IF NEW.status IN ('pending_payment','confirmed','active') AND OLD.status NOT IN ('confirmed','active') AND EXISTS(SELECT 1 FROM json_each(NEW.unit_ids) j JOIN units u ON u.id=j.value WHERE u.state<>'ready') THEN RAISE EXCEPTION 'UNIT_NOT_READY' USING ERRCODE='23514'; END IF;
 IF NEW.status IN ('pending_payment','confirmed','active') AND EXISTS(SELECT 1 FROM bookings b,json_each(b.unit_ids) old_unit,json_each(NEW.unit_ids) new_unit WHERE b.id<>NEW.id AND b.status IN ('pending_payment','confirmed','active') AND old_unit.value=new_unit.value AND b.start_at<NEW.end_at+3600000 AND b.end_at+3600000>NEW.start_at) THEN RAISE EXCEPTION 'BOOKING_CONFLICT' USING ERRCODE='23514'; END IF;
 IF NEW.status IN ('pending_payment','confirmed','active') AND EXISTS(SELECT 1 FROM handovers h,json_each(NEW.unit_ids) j WHERE h.kind='out' AND h.unit_id=j.value AND h.booking_id<>NEW.id AND NOT EXISTS(SELECT 1 FROM handovers r WHERE r.booking_id=h.booking_id AND r.unit_id=h.unit_id AND r.kind='in')) THEN RAISE EXCEPTION 'ACTIVE_UNIT' USING ERRCODE='23514'; END IF;
RETURN NEW;
END $$;

CREATE TRIGGER booking_update_guard BEFORE UPDATE OF unit_ids,start_at,end_at,status ON ops.bookings FOR EACH ROW EXECUTE FUNCTION ops.booking_update_guard_fn();

CREATE FUNCTION ops.source_rental_booking_insert_fn() RETURNS trigger LANGUAGE plpgsql SET search_path=ops,public AS $$ BEGIN
IF NEW.status IN ('pending_payment','confirmed','active') THEN
IF EXISTS(SELECT 1 FROM json_each(NEW.unit_ids) j JOIN units u ON u.id=j.value WHERE u.usage IN ('sold','internal')) OR EXISTS(SELECT 1 FROM rental_records r,json_each(r.unit_ids) a,json_each(NEW.unit_ids) b WHERE a.value=b.value AND r.source_status<>'Done' AND r.followup_state<>'returned') THEN RAISE EXCEPTION 'SOURCE_RENTAL_OPEN' USING ERRCODE='23514'; END IF;
END IF;
RETURN NEW;
END $$;

CREATE TRIGGER source_rental_booking_insert BEFORE INSERT ON ops.bookings FOR EACH ROW EXECUTE FUNCTION ops.source_rental_booking_insert_fn();

CREATE FUNCTION ops.source_rental_booking_update_fn() RETURNS trigger LANGUAGE plpgsql SET search_path=ops,public AS $$ BEGIN
IF NEW.status IN ('pending_payment','confirmed','active') THEN
IF EXISTS(SELECT 1 FROM json_each(NEW.unit_ids) j JOIN units u ON u.id=j.value WHERE u.usage IN ('sold','internal')) OR EXISTS(SELECT 1 FROM rental_records r,json_each(r.unit_ids) a,json_each(NEW.unit_ids) b WHERE a.value=b.value AND r.source_status<>'Done' AND r.followup_state<>'returned') THEN RAISE EXCEPTION 'SOURCE_RENTAL_OPEN' USING ERRCODE='23514'; END IF;
END IF;
RETURN NEW;
END $$;

CREATE TRIGGER source_rental_booking_update BEFORE UPDATE OF unit_ids,status,start_at,end_at ON ops.bookings FOR EACH ROW EXECUTE FUNCTION ops.source_rental_booking_update_fn();
