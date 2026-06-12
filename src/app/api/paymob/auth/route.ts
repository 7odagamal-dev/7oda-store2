import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/paymob';
import { getAdminSession } from '@/lib/auth';
import { csrfGuard } from '@/lib/csrf';

export async function GET(req: NextRequest) {
  const csrfResp = csrfGuard(req);
  if (csrfResp) return csrfResp;
  const session = await getAdminSession(req);
  if (!session.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const token = await authenticate();
    return NextResponse.json({ token });
  } catch {
    return NextResponse.json({ error: 'Paymob auth failed' }, { status: 500 });
  }
}
