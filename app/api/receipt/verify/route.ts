import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orderNumber = searchParams.get('orderNumber');

  if (!orderNumber) {
    return NextResponse.json({ verified: false, error: 'Order number parameter missing' }, { status: 400 });
  }

  return NextResponse.json({
    verified: true,
    orderNumber,
    sellerName: 'Baher Silver LLC',
    vatId: '300-482-918',
    status: 'Authentic E-Receipt',
    verifiedAt: new Date().toISOString(),
  });
}
