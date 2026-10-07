import "server-only";
import { z } from "zod";
import { getPool } from "@/lib/db";
import { storageErrorFromThrown } from "@/lib/storageErrors";

/**
 * Admin-editable settings (settings table, one JSON value per key).
 * Defaults apply when a row is missing, so the site keeps working on a
 * fresh database.
 */

export const referralSettingsSchema = z.object({
  /** Discount for the customer who uses a referral code (% of the rental amount). */
  refereeDiscountPercent: z.number().int().min(0).max(100),
  /** Earnings for the code owner (% of the rental amount the referee paid). */
  referrerFeePercent: z.number().int().min(0).max(100),
  /** Smallest available balance that can be paid out (IDR). */
  minPayoutIdr: z.number().int().min(10_000).max(100_000_000),
  /** Referral codes work only on the referee's first paid booking. */
  firstBookingOnly: z.boolean(),
});

export type ReferralSettings = z.infer<typeof referralSettingsSchema>;

export const DEFAULT_REFERRAL_SETTINGS: ReferralSettings = {
  refereeDiscountPercent: 10,
  referrerFeePercent: 10,
  minPayoutIdr: 500_000,
  firstBookingOnly: true,
};

export async function getReferralSettings(): Promise<ReferralSettings> {
  try {
    const res = await getPool().query("select value from settings where key = 'referral'");
    const parsed = referralSettingsSchema.safeParse({ ...DEFAULT_REFERRAL_SETTINGS, ...(res.rows[0]?.value ?? {}) });
    return parsed.success ? parsed.data : DEFAULT_REFERRAL_SETTINGS;
  } catch (err) {
    throw storageErrorFromThrown("get_settings", err);
  }
}

export async function setReferralSettings(value: ReferralSettings, actorEmail: string): Promise<ReferralSettings> {
  try {
    await getPool().query(
      `insert into settings (key, value, updated_by, updated_at) values ('referral', $1::jsonb, $2, now())
       on conflict (key) do update set value = excluded.value, updated_by = excluded.updated_by, updated_at = now()`,
      [JSON.stringify(value), actorEmail]
    );
    return value;
  } catch (err) {
    throw storageErrorFromThrown("set_settings", err);
  }
}

/* ================= Notifications ================= */

export const notificationSettingsSchema = z.object({
  /** Staff WhatsApp numbers, digits only international (628…). Falls back to ADMIN_WHATSAPP_NUMBERS when empty. */
  adminNumbers: z.array(z.string().regex(/^\d{9,15}$/)).max(20),
  bookingNewAdmin: z.boolean(),
  bookingPaidAdmin: z.boolean(),
  bookingPaidCustomer: z.boolean(),
  payoutRequestedAdmin: z.boolean(),
  payoutPaidCustomer: z.boolean(),
});

export type NotificationSettings = z.infer<typeof notificationSettingsSchema>;
export type NotificationKind = Exclude<keyof NotificationSettings, "adminNumbers">;

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  adminNumbers: [],
  bookingNewAdmin: true,
  bookingPaidAdmin: true,
  bookingPaidCustomer: true,
  payoutRequestedAdmin: true,
  payoutPaidCustomer: true,
};

export async function getNotificationSettings(): Promise<NotificationSettings> {
  try {
    const res = await getPool().query("select value from settings where key = 'notifications'");
    const parsed = notificationSettingsSchema.safeParse({ ...DEFAULT_NOTIFICATION_SETTINGS, ...(res.rows[0]?.value ?? {}) });
    return parsed.success ? parsed.data : DEFAULT_NOTIFICATION_SETTINGS;
  } catch (err) {
    throw storageErrorFromThrown("get_settings", err);
  }
}

export async function setNotificationSettings(value: NotificationSettings, actorEmail: string): Promise<NotificationSettings> {
  try {
    await getPool().query(
      `insert into settings (key, value, updated_by, updated_at) values ('notifications', $1::jsonb, $2, now())
       on conflict (key) do update set value = excluded.value, updated_by = excluded.updated_by, updated_at = now()`,
      [JSON.stringify(value), actorEmail]
    );
    return value;
  } catch (err) {
    throw storageErrorFromThrown("set_settings", err);
  }
}

