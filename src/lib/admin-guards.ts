import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession, UserRole } from '@/lib/auth';

/**
 * requireRole — Authorization guard for admin API routes.
 *
 * Usage:
 *   const roleResp = requireRole(req, ['superadmin', 'admin']);
 *   if (roleResp) return roleResp; // 401 or 403
 *
 * Returns:
 *   - null if the request passes (has a valid session with an allowed role)
 *   - NextResponse (401) if unauthenticated
 *   - NextResponse (403) if authenticated but role is not in allowedRoles
 */
export async function requireRole(
  req: NextRequest,
  allowedRoles: UserRole[],
): Promise<NextResponse | null> {
  const session = await getAdminSession(req);
  if (!session.valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!session.role || !allowedRoles.includes(session.role)) {
    return NextResponse.json(
      { error: 'Forbidden: insufficient permissions' },
      { status: 403 },
    );
  }
  return null;
}
