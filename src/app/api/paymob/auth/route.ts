import { NextResponse } from 'next/server';
import { getAuthToken } from '@/lib/paymob';

export async function GET() {
  try {
    const token = await getAuthToken();
    return NextResponse.json({ token });
  } catch {
    return NextResponse.json({ error: 'Paymob auth failed' }, { status: 500 });
  }
}
