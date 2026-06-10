/** Convert an OAuth `expires_in` (seconds) into an absolute ISO expiry, or null. */
export function getLinearTokenExpiry(expiresIn: number | null | undefined) {
  return expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;
}
