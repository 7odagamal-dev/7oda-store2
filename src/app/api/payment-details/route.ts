import { NextResponse } from 'next/server';

export async function GET() {
  const vodafone_cash = process.env.PAYMENT_VODAFONE_CASH;
  const instapay = process.env.PAYMENT_INSTAPAY;
  const bank = process.env.PAYMENT_BANK_DETAILS;

  if (!vodafone_cash && !instapay && !bank) {
    return NextResponse.json({ error: 'Payment details not configured' }, { status: 503 });
  }

  return NextResponse.json({
    vodafone_cash: vodafone_cash || null,
    instapay: instapay || null,
    bank: bank || null,
  });
}
