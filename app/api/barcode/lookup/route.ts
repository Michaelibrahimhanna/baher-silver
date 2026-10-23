import { NextResponse } from 'next/server';
import { lookupByBarcode } from '@/lib/db/productEngine';
import { assertApiAuth, handleApiAuthError } from '@/lib/auth/apiGuard';
import {
  projectCashierItem,
  proxyToMipCoreBarcodeLookup,
  assertNoConfidentialFields
} from '@/lib/security/cashierProjection';

export async function GET(request: Request) {
  try {
    const auth = await assertApiAuth(request, {
      requiredPermission: 'product:read',
      actionDescription: 'Barcode Scanner Lookup'
    });

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code') || searchParams.get('barcode');

    if (!code || !code.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'BAD_REQUEST',
          message: 'Missing required query parameter "code" or "barcode".'
        },
        { status: 400 }
      );
    }

    const cleanCode = code.trim();

    // 1. Attempt server-side proxy to MIP Core if configured
    const proxyResult = await proxyToMipCoreBarcodeLookup(cleanCode, {
      organizationId: auth.organizationId,
      branchId: auth.user.branchId,
      token: auth.session.sessionId
    });

    if (proxyResult) {
      if (proxyResult.success) {
        return NextResponse.json({
          success: true,
          item: proxyResult.data,
          ...proxyResult.data
        });
      }

      if (proxyResult.status === 404) {
        return NextResponse.json(
          {
            success: false,
            error: 'NOT_FOUND',
            message: proxyResult.error || `No product found matching barcode "${cleanCode}".`
          },
          { status: 404 }
        );
      }

      // Fail closed on authorization violations or missing credentials
      if (proxyResult.status === 401 || proxyResult.status === 403) {
        return NextResponse.json(
          {
            success: false,
            error: proxyResult.status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN',
            message: proxyResult.error || 'MIP Core authorization failed. Failing closed to prevent security bypass.'
          },
          { status: proxyResult.status }
        );
      }

      // Fail closed on upstream server errors
      if (proxyResult.status && proxyResult.status >= 500) {
        return NextResponse.json(
          {
            success: false,
            error: 'UPSTREAM_MIP_CORE_ERROR',
            message: `MIP Core cross-service call failed: ${proxyResult.error}`
          },
          { status: 502 }
        );
      }
    }

    // 2. Local Engine Fallback with strict Cashier Projection
    const result = lookupByBarcode(cleanCode, auth.organizationId);

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          error: 'NOT_FOUND',
          message: `No product or piece matching barcode/serial "${cleanCode}" was found.`
        },
        { status: 404 }
      );
    }

    // Strict Cashier Projection: Strips cost_basis, manufacturing cost, supplier info, and margins
    const projectedItem = projectCashierItem(result.product, result.piece);

    // Cryptographic/runtime guarantee: Assert zero confidential fields exist
    assertNoConfidentialFields(projectedItem);

    return NextResponse.json({
      success: true,
      item: projectedItem,
      match_type: result.match_type,
      profile_type: projectedItem.profileType,
      available: projectedItem.available,
      // Backward-compatible projections for POS cart
      product: {
        id: projectedItem.productId,
        name: projectedItem.name,
        sku: projectedItem.sku,
        barcode: projectedItem.barcode,
        profile_type: projectedItem.profileType,
        purity: projectedItem.purity,
        weight_grams: projectedItem.weightGrams,
        price: projectedItem.retailPrice,
        pricing_type: projectedItem.pricingType,
        workmanship_fee_per_gram: projectedItem.workmanshipFeePerGram,
        fixed_price: projectedItem.fixedPrice
      },
      piece: result.piece ? {
        id: result.piece.id,
        serial_number: result.piece.serial_number,
        barcode: result.piece.barcode,
        sku: result.piece.sku,
        current_weight_grams: result.piece.current_weight_grams,
        retail_price: result.piece.retail_price,
        lifecycle_status: result.piece.lifecycle_status,
        location_code: result.piece.location_code
      } : undefined
    });
  } catch (error: unknown) {
    return handleApiAuthError(error);
  }
}
