import "server-only";
import { getPool } from "@/lib/db";
import { storageErrorFromThrown } from "@/lib/storageErrors";
import type { Identity, IdType } from "@/lib/identitySchema";

/**
 * Server access to customer identity (customer_identity table).
 * The data never travels in the session; it is read here on demand.
 */

export interface StoredIdentity {
  idType: IdType;
  idNumber: string;
  drivingLicenseNumber: string;
  updatedAt: string;
}

export async function getIdentity(userId: string): Promise<StoredIdentity | null> {
  try {
    const res = await getPool().query(
      `select id_type, id_number, driving_license_number, updated_at
       from customer_identity where user_id = $1`,
      [userId]
    );
    const r = res.rows[0];
    if (!r) return null;
    return {
      idType: r.id_type,
      idNumber: r.id_number,
      drivingLicenseNumber: r.driving_license_number,
      updatedAt: new Date(r.updated_at).toISOString(),
    };
  } catch (err) {
    throw storageErrorFromThrown("get_identity", err);
  }
}

export async function hasIdentity(userId: string): Promise<boolean> {
  return (await getIdentity(userId)) !== null;
}

/**
 * Once a customer has a paid booking, the documents staff will check
 * at handover are fixed; changes go through the team.
 */
export async function identityLocked(userId: string): Promise<boolean> {
  try {
    const res = await getPool().query(
      "select 1 from bookings where user_id = $1 and payment_status in ('paid', 'refunded') limit 1",
      [userId]
    );
    return (res.rowCount ?? 0) > 0;
  } catch (err) {
    throw storageErrorFromThrown("identity_locked", err);
  }
}

export class IdentityTakenError extends Error {
  constructor() {
    super("identity_taken");
    this.name = "IdentityTakenError";
  }
}

export async function saveIdentity(userId: string, id: Identity): Promise<StoredIdentity> {
  try {
    const res = await getPool().query(
      `insert into customer_identity (user_id, id_type, id_number, driving_license_number)
       values ($1, $2, $3, $4)
       on conflict (user_id) do update set
         id_type = excluded.id_type,
         id_number = excluded.id_number,
         driving_license_number = excluded.driving_license_number
       returning id_type, id_number, driving_license_number, updated_at`,
      [userId, id.idType, id.idNumber, id.drivingLicenseNumber]
    );
    const r = res.rows[0];
    return {
      idType: r.id_type,
      idNumber: r.id_number,
      drivingLicenseNumber: r.driving_license_number,
      updatedAt: new Date(r.updated_at).toISOString(),
    };
  } catch (err) {
    const se = storageErrorFromThrown("save_identity", err);
    if (se.detail.code === "23505" && se.detail.constraint === "customer_identity_document_uniq") {
      throw new IdentityTakenError();
    }
    throw se;
  }
}

/** Identity of a booking's customer, for the admin booking detail. */
export async function identityForBooking(bookingId: string): Promise<StoredIdentity | null> {
  try {
    const res = await getPool().query(
      `select ci.id_type, ci.id_number, ci.driving_license_number, ci.updated_at
       from bookings b join customer_identity ci on ci.user_id = b.user_id
       where b.id = $1::uuid`,
      [bookingId]
    );
    const r = res.rows[0];
    if (!r) return null;
    return {
      idType: r.id_type,
      idNumber: r.id_number,
      drivingLicenseNumber: r.driving_license_number,
      updatedAt: new Date(r.updated_at).toISOString(),
    };
  } catch (err) {
    throw storageErrorFromThrown("identity_for_booking", err);
  }
}
