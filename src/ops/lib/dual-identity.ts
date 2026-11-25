// Reserved principal namespace. Only the two-access invitation route creates
// these IDs; legacy Ops IDs are UUIDs and cannot acquire a website grant.
const dualIdPattern = /^dual:[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
export const isDualId = (id: unknown): id is string => typeof id === 'string' && dualIdPattern.test(id);
export const newDualId = () => 'dual:' + crypto.randomUUID();
export const dualPasswordMin = 4;
export const dualPasswordMax = 20;
export const dualPasswordRange = `${dualPasswordMin}–${dualPasswordMax}`;
export const validDualPassword = (value: unknown): value is string =>
  typeof value === 'string' && value.length <= dualPasswordMax && Array.from(value.trim()).length >= dualPasswordMin;

export function websiteRoleForDualMember(member: {id?: unknown; email?: unknown; role?: unknown}) {
  if (!isDualId(member.id) || member.email !== 'user:' + member.id) return null;
  if (member.role === 'owner') return 'super_admin';
  if (['ops', 'manager', 'finance'].includes(String(member.role))) return 'admin';
  return null;
}
