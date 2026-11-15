// Only the gateway's current snapshot can establish natural Snap page expiry.
// The laptop/build host clock and an unrecognised/404 response are insufficient.
export function snapExpiredAtProvider(data, {token, orderId, grossAmount}) {
 if (!data || data.token !== token || data.transaction_details?.order_id !== orderId || Number(data.transaction_details?.gross_amount) !== Number(grossAmount)) return false;
 const expires = typeof data.expiry_time === 'string' ? Date.parse(data.expiry_time) : NaN;
 const server = typeof data.server_time === 'number' ? data.server_time * 1000 : NaN;
 return Number.isFinite(expires) && Number.isFinite(server) && server >= expires;
}

export function coreClosedOrAbsent(response, orderId) {
 if (!response?.data || response.http === 401 || response.http === 403 || response.http >= 500) return false;
 if (response.http === 404 && String(response.data.status_code) === '404') return true;
 return response.http === 200 && response.data.order_id === orderId && ['cancel','expire','deny','failure'].includes(response.data.transaction_status);
}

// Midtrans uses 407 for an expired transaction (not a proxy-auth challenge).
// This applies only to a fresh GET of the exact QA Snap token; Core is checked
// independently afterwards because a payment method can outlive the page.
export function snapExplicitlyExpired(response) {
 return response?.http === 407 && Array.isArray(response.data?.error_messages) && response.data.error_messages.some(message => typeof message === 'string' && /\bexpired\b/i.test(message));
}
