-- ============================================================
-- Phase 1 enums. Kept in their own file: a value added to an enum
-- cannot be used in the same transaction, and db-migrate runs each
-- file inside one transaction.
-- ============================================================

-- Booking lifecycle gains the pre-payment and expired states.
alter type booking_status add value if not exists 'pending_payment' before 'new';
alter type booking_status add value if not exists 'expired';

-- Payment state is tracked separately from the operational status.
create type payment_status as enum (
  'unpaid',    -- legacy / WhatsApp-mode bookings, nothing to collect online
  'pending',   -- Snap transaction created, waiting for the customer
  'paid',      -- settlement or accepted capture confirmed by Midtrans
  'expired',   -- customer never paid within the window
  'failed',    -- denied / cancelled by the provider
  'refunded'   -- refunded (fully or partially) after payment
);
