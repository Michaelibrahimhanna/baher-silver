import { NextResponse } from 'next/server';
import { resolveQRDestinationUrl, generateQRRouterConfig } from '@/lib/qr-router';

export async function GET(
  request: Request,
  context: { params: Promise<{ code: string }> }
) {
  const { code } = await context.params;

  // In production, fetch QR configuration from DB using code token.
  // Demonstration default mapping logic:
  const isMemories = code.toLowerCase().includes('memories');
  const isWarranty = code.toLowerCase().includes('warranty');

  const config = generateQRRouterConfig(
    'silver-ring-heritage-101',
    isMemories ? 'memories' : isWarranty ? 'warranty' : 'product'
  );
  config.router_token = code;

  const resolution = resolveQRDestinationUrl(config, 'silver-ring-heritage-101');

  if (resolution.isDisabled) {
    return NextResponse.json(
      {
        success: false,
        router_token: code,
        message: resolution.message || 'Destination disabled',
        target_url: resolution.targetUrl,
      },
      { status: 200 }
    );
  }

  return NextResponse.redirect(new URL(resolution.targetUrl, request.url));
}
