import { sha256 } from './password';

export const dualInviteHash = (token: string) => sha256('werigo-workspace-invite:v1:' + token);
export const dualInviteAge = 60 * 60_000;
export const dualInviteError = 'Link tidak valid, sudah dipakai, atau kedaluwarsa.';
