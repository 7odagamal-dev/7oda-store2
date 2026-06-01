import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    vodafone_cash: process.env.PAYMENT_VODAFONE_CASH || '01024627197',
    instapay: process.env.PAYMENT_INSTAPAY || 'youssefwhab@instapay',
    bank: process.env.PAYMENT_BANK_DETAILS || 'N/A',
  });
}
