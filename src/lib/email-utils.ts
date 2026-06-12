const STRICT_EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

export function isValidEmail(email: string): boolean {
  return STRICT_EMAIL_REGEX.test(email);
}

export function normalizeEmail(email: string): string | null {
  if (!email) return null;
  const stripped = email.replace(/<[^>]*>/g, '');
  let normalized = stripped.trim().toLowerCase();
  normalized = normalized.replace(/\+[^@]*@/, '@');
  if (!normalized || !STRICT_EMAIL_REGEX.test(normalized)) return null;
  return normalized;
}

export function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, '');
}
