import { NextResponse } from 'next/server';
import { computeDerivedStock } from '@/lib/db/productEngine';
import { assertApiAuth, handleApiAuthError } from '@/lib/auth/apiGuard';

export async function GET(request: Request) {
  try {
    const auth = await assertApiAuth(request, {
      requiredPermission: 'inventory:read',
      actionDescription: 'Query Stock Balances'
    });

    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get('warehouse_id') || undefined;
    const productId = searchParams.get('product_id') || undefined;
    const purity = searchParams.get('purity') || undefined;

    const balances = computeDerivedStock({
      organization_id: auth.organizationId,
      warehouse_id: warehouseId,
      product_id: productId,
      purity
    });

    // Summary totals across balances
    const summary = balances.reduce(
      (acc, b) => {
        acc.total_on_hand += b.total_on_hand;
        acc.vault_stock += b.vault_stock;
        acc.showcase_stock += b.showcase_stock;
        acc.reserved_stock += b.reserved_stock;
        acc.available_stock += b.available_stock;
        acc.quarantine_stock += b.quarantine_stock;
        acc.scrapped_stock += b.scrapped_stock;
        return acc;
      },
      {
        total_on_hand: 0,
        vault_stock: 0,
        showcase_stock: 0,
        reserved_stock: 0,
        available_stock: 0,
        quarantine_stock: 0,
        scrapped_stock: 0
      }
    );

    return NextResponse.json({
      success: true,
      organization_id: auth.organizationId,
      warehouse_id: warehouseId || 'all',
      count: balances.length,
      summary,
      balances
    });
  } catch (error: unknown) {
    return handleApiAuthError(error);
  }
}
