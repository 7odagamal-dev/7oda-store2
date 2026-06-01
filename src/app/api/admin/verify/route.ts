import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession, warmupSchema } from '@/lib/auth';

export async function GET(req: NextRequest) {
  warmupSchema();
  const session = await getAdminSession(req);

  if (!session.valid) {
    return NextResponse.json({ valid: false }, { status: 401 });
  }

  return NextResponse.json({
    valid: true,
    storeId: session.storeId,
    role: session.role,
    userId: session.userId,
  });
}
