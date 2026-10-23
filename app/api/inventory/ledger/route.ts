import { NextResponse } from 'next/server';
import { getStockLedger } from '@/lib/db/productEngine';
import { assertApiAuth, handleApiAuthError } from '@/lib/auth/apiGuard';
import type { CanonicalStockMovementType } from '@/types/erp';

export async function GET(request: Request) {
  try {
    const auth = await assertApiAuth(request, {
      requiredPermission: 'inventory:read',
      actionDescription: 'Query Stock Ledger'
    });

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('product_id') || undefined;
    const pieceId = searchParams.get('piece_id') || undefined;
    const serialNumber = searchParams.get('serial_number') || undefined;
    const warehouseId = searchParams.get('warehouse_id') || undefined;
    const movementType = (searchParams.get('movement_type') as CanonicalStockMovementType) || undefined;
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 50;
    const offset = searchParams.get('offset') ? Number(searchParams.get('offset')) : 0;

    const result = getStockLedger({
      organization_id: auth.organizationId,
      product_id: productId,
      piece_id: pieceId,
      serial_number: serialNumber,
      warehouse_id: warehouseId,
      movement_type: movementType,
      limit,
      offset
    });

    return NextResponse.json({
      success: true,
      organization_id: auth.organizationId,
      total: result.total,
      count: result.events.length,
      offset,
      limit,
      events: result.events
    });
  } catch (error: unknown) {
    return handleApiAuthError(error);
  }
}
