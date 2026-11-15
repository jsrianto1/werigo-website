# Werigo Ops on the website

The staff workspace is `/ops`; its authenticated endpoints are `/api/ops/*`.
It uses the website's existing PostgreSQL connection, with operational tables in
the separate `ops` schema. The customer website, PWA, Better Auth accounts and
existing environment values are preserved.

Website reservations and physical bike allocation commit in one transaction.
Manual bookings, open imported rentals, unit condition, actual handovers and the
one-hour preparation interval all affect availability. Missing physical stock is
zero availability. Website paid outcomes create one immutable Ops receipt using
the website's verified payment time; staff must not enter a second rental receipt.
Refunds need their actual receipt/time recorded by finance; synchronization does
not invent a refund timestamp. Existing source cash records retain their original
provenance and dates. Customer history follows Ops motor-out/return status.

## Controlled migration

1. Run `build:ops-inspect` through the existing hosting build environment. It
   reports schema names, aggregate future commitments and a public signing key.
   It does not modify data or environments.
2. Pin that public key in the existing source Site's new migration configuration.
   Temporarily enable its migration read-only flag. Existing environment entries
   must remain unchanged. Both its regular mutations and the former booking bridge
   reject writes during the frozen snapshot.
3. Run `build:ops-migrate`. The website signs a bounded-path export request using
   its existing server secret. The snapshot is fetched server-to-server, never
   printed, committed or embedded in client code. The importer checks every table
   and row, preserves staff password hashes and roles, and verifies every evidence
   file. Old login sessions/rate limits are not transferred across domains.
4. Migrations 0019 and 0020, imported rows, files and existing future/active website
   reservations commit together. Any mismatch or allocation conflict rolls the
   transaction back. The old Site remains intact. Schema checksums cannot be edited.
5. Run verification, check live availability and protected APIs, then enable the old
   Site's existing redirect flag and remove/disable its migration export public key.
   Keep that Site read-only as a rollback record; never operate two writable copies.

Hosting logs contain aggregate counts/error codes only. No passwords, payment
credentials, customer payloads or signatures are printed. No extra website env
variable, cron, network bridge or secret rotation is required.

## Layout

Ops styles are prefixed with `.werigo-ops`. Financial cards use zero-minimum tracks,
container-relative numeric type, wrapping labels and complete amounts. Wide tables
scroll within their container. The marketing layout and customer PWA retain their
own styles. Physical-device appearance needs a device check when browser QA is
unavailable; static checks are not a screenshot approval.
