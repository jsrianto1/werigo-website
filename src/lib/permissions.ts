import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/admin/access";

/**
 * Role-based permissions (shared by the server auth config and the
 * browser auth client).
 *
 *   customer     — public accounts (Phase 1); no admin rights
 *   admin        — day-to-day operations: bookings, customers, stock, promos
 *   super_admin  — everything, including refunds, payouts, settings, staff
 *
 * The `user`/`session` resources come from the Better Auth admin
 * plugin (create/ban/set-role/…); the rest are Werigo's own.
 */
export const statement = {
  ...defaultStatements,
  booking: ["read", "update", "export", "refund"],
  customer: ["read", "voucher", "suspend"],
  stock: ["manage"],
  promo: ["manage"],
  referral: ["settings", "payout"],
  settings: ["manage"],
  audit: ["read"],
} as const;

export const ac = createAccessControl(statement);

export const roles = {
  customer: ac.newRole({
    user: [],
    session: [],
  }),
  admin: ac.newRole({
    user: ["get", "list"],
    session: [],
    booking: ["read", "update", "export"],
    customer: ["read", "voucher"],
    stock: ["manage"],
    promo: ["manage"],
  }),
  super_admin: ac.newRole({
    user: ["create", "list", "set-role", "ban", "delete", "set-password", "set-email", "get", "update"],
    session: ["list", "revoke", "delete"],
    booking: ["read", "update", "export", "refund"],
    customer: ["read", "voucher", "suspend"],
    stock: ["manage"],
    promo: ["manage"],
    referral: ["settings", "payout"],
    settings: ["manage"],
    audit: ["read"],
  }),
};
