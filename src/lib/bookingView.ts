import type { StoredBooking } from "@/lib/bookingStore";
import type { PaymentRow } from "@/lib/paymentStore";

/**
 * What the browser is allowed to see of a booking (customer account,
 * confirmation page). Internal notes, assignment and attribution stay
 * on the server.
 */
export interface PublicBooking {
  bookingCode: string;
  createdAt: string;
  status: string;
  paymentStatus: string;
  paymentExpiresAt: string | null;
  paidAt: string | null;
  fullName: string;
  whatsappNumber: string;
  email: string | null;
  vehicleModel: string;
  quantity: number;
  pickupArea: string;
  pickupAddress: string | null;
  returnArea: string;
  returnAddress: string | null;
  startAt: string;
  endAt: string;
  customerNotes: string | null;
  rentalDays: number | null;
  ratePerDayIdr: number | null;
  baseIdr: number | null;
  areaFeeIdr: number;
  discountIdr: number;
  totalIdr: number | null;
}

export interface PublicPayment {
  orderId: string;
  /** Present only while the window is open and the customer may still pay. */
  snapToken: string | null;
  redirectUrl: string | null;
  expiresAt: string | null;
  transactionStatus: string | null;
  paymentType: string | null;
}

export function toPublicBooking(b: StoredBooking): PublicBooking {
  return {
    bookingCode: b.booking_code,
    createdAt: b.created_at,
    status: b.status,
    paymentStatus: b.payment_status,
    paymentExpiresAt: b.payment_expires_at,
    paidAt: b.paid_at,
    fullName: b.full_name,
    whatsappNumber: b.whatsapp_number,
    email: b.email,
    vehicleModel: b.vehicle_model,
    quantity: b.quantity,
    pickupArea: b.pickup_area,
    pickupAddress: b.pickup_address,
    returnArea: b.return_area,
    returnAddress: b.return_address,
    startAt: b.start_at,
    endAt: b.end_at,
    customerNotes: b.customer_notes,
    rentalDays: b.rental_days,
    ratePerDayIdr: b.rate_per_day_idr,
    baseIdr: b.base_idr,
    areaFeeIdr: b.area_fee_idr,
    discountIdr: b.discount_idr,
    totalIdr: b.total_idr,
  };
}

export function toPublicPayment(b: StoredBooking, p: PaymentRow | null): PublicPayment | null {
  if (!p) return null;
  const open =
    b.payment_status === "pending" &&
    Boolean(b.payment_expires_at && new Date(b.payment_expires_at).getTime() > Date.now());
  return {
    orderId: p.order_id,
    snapToken: open ? p.snap_token : null,
    redirectUrl: open ? p.redirect_url : null,
    expiresAt: b.payment_expires_at,
    transactionStatus: p.transaction_status,
    paymentType: p.payment_type,
  };
}
