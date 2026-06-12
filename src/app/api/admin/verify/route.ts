import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession, warmupSchema } from '@/lib/auth';
import { requireRole } from '@/lib/admin-guards';

export async function GET(req: NextRequest) {
  warmupSchema();
  const roleResp = await requireRole(req, ['superadmin', 'admin']);
  if (roleResp) return roleResp;
  const session = await getAdminSession(req);

  return NextResponse.json({
    valid: true,
    storeId: session.storeId,
    role: session.role,
    userId: session.userId,
  });
}
