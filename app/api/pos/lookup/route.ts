import { NextRequest, NextResponse } from 'next/server';
import { assertApiAuth, handleApiAuthError } from '@/lib/auth/apiGuard';
import { lookupByBarcode, getProductBySlugOrId, getPieceBySerial, getProducts } from '@/lib/db/productEngine';
import { assertNoConfidentialFields } from '@/lib/security/cashierProjection';

/**
 * Sanitizes a piece for cashier presentation, strictly stripping cost_basis and internal IDs.
 */
function sanitizeCashierPiece(piece: any) {
  if (!piece) return undefined;
  return {
    id: piece.id,
    serial_number: piece.serial_number,
    barcode: piece.barcode,
    sku: piece.sku,
    current_weight_grams: piece.current_weight_grams,
    retail_price: piece.retail_price,
    lifecycle_status: piece.lifecycle_status,
    location_code: piece.location_code
  };
}

/**
 * Sanitizes a product for cashier presentation, strictly stripping cost_price, margins, and lineage.
 */
function sanitizeCashierProduct(product: any) {
  if (!product) return undefined;
  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    barcode: product.barcode,
    category: product.category,
    profile_type: product.profile_type || 'SILVER_JEWELRY',
    purity: product.purity || product.base_purity || '925',
    weight_grams: product.weight_grams,
    price: product.price || product.retail_price || 0,
    pricing_type: product.pricing_type,
    workmanship_fee_per_gram: product.workmanship_fee_per_gram,
    fixed_price: product.fixed_price,
    status: product.status || 'active'
  };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await assertApiAuth(req, {
      requiredPermission: 'product:read',
      actionDescription: 'POS Barcode / Product Lookup'
    });

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || searchParams.get('barcode') || '';

    if (!query.trim()) {
      return NextResponse.json({ success: false, error: 'Lookup query is required' }, { status: 400 });
    }

    const clean = query.trim();

    // 1. Try barcode lookup
    const barcodeResult = lookupByBarcode(clean, auth.organizationId);
    if (barcodeResult) {
      const sanitizedProduct = sanitizeCashierProduct(barcodeResult.product);
      const sanitizedPiece = sanitizeCashierPiece(barcodeResult.piece);
      const responsePayload = {
        success: true,
        type: 'BARCODE_MATCH',
        product: sanitizedProduct,
        piece: sanitizedPiece,
        profile_type: barcodeResult.profile_type,
        available: barcodeResult.piece
          ? barcodeResult.piece.lifecycle_status === 'IN_SHOWCASE' || barcodeResult.piece.lifecycle_status === 'IN_VAULT'
          : true
      };
      assertNoConfidentialFields(responsePayload);
      return NextResponse.json(responsePayload);
    }

    // 2. Try piece serial lookup
    const pieceResult = getPieceBySerial(clean, auth.organizationId);
    if (pieceResult) {
      const sanitizedProduct = sanitizeCashierProduct(pieceResult.product);
      const sanitizedPiece = sanitizeCashierPiece(pieceResult.piece);
      const responsePayload = {
        success: true,
        type: 'SERIAL_MATCH',
        product: sanitizedProduct,
        piece: sanitizedPiece,
        profile_type: pieceResult.product.profile_type || 'SILVER_JEWELRY',
        available: pieceResult.piece.lifecycle_status === 'IN_SHOWCASE' || pieceResult.piece.lifecycle_status === 'IN_VAULT'
      };
      assertNoConfidentialFields(responsePayload);
      return NextResponse.json(responsePayload);
    }

    // 3. Try exact product ID / SKU / Slug lookup
    const productResult = getProductBySlugOrId(clean, auth.organizationId);
    if (productResult) {
      const availablePieces = productResult.pieces?.filter(
        (pc) => pc.lifecycle_status === 'IN_SHOWCASE' || pc.lifecycle_status === 'IN_VAULT'
      ) || [];
      const primaryPiece = availablePieces[0] || (productResult.pieces && productResult.pieces.length > 0 ? productResult.pieces[0] : null);

      const responsePayload = {
        success: true,
        type: 'PRODUCT_MATCH',
        product: sanitizeCashierProduct(productResult),
        piece: sanitizeCashierPiece(primaryPiece),
        profile_type: productResult.profile_type || 'SILVER_JEWELRY',
        available: productResult.profile_type === 'NON_SILVER_RETAIL' || availablePieces.length > 0,
        available_pieces: availablePieces.map(sanitizeCashierPiece)
      };
      assertNoConfidentialFields(responsePayload);
      return NextResponse.json(responsePayload);
    }

    // 4. Try keyword / product name search
    const searchMatches = getProducts({
      query: clean,
      organizationId: auth.organizationId
    });

    if (searchMatches.length === 1) {
      const single = searchMatches[0];
      const availablePieces = single.pieces?.filter(
        (pc) => pc.lifecycle_status === 'IN_SHOWCASE' || pc.lifecycle_status === 'IN_VAULT'
      ) || [];
      const primaryPiece = availablePieces[0] || (single.pieces && single.pieces.length > 0 ? single.pieces[0] : null);

      const responsePayload = {
        success: true,
        type: 'PRODUCT_MATCH',
        product: sanitizeCashierProduct(single),
        piece: sanitizeCashierPiece(primaryPiece),
        profile_type: single.profile_type || 'SILVER_JEWELRY',
        available: single.profile_type === 'NON_SILVER_RETAIL' || availablePieces.length > 0,
        available_pieces: availablePieces.map(sanitizeCashierPiece)
      };
      assertNoConfidentialFields(responsePayload);
      return NextResponse.json(responsePayload);
    }

    if (searchMatches.length > 1) {
      const responsePayload = {
        success: true,
        type: 'MULTIPLE_MATCHES',
        count: searchMatches.length,
        matches: searchMatches.map((m) => {
          const avail = m.pieces?.filter(
            (pc) => pc.lifecycle_status === 'IN_SHOWCASE' || pc.lifecycle_status === 'IN_VAULT'
          ) || [];
          return {
            id: m.id,
            sku: m.sku,
            barcode: m.barcode,
            name: m.name,
            category: m.category,
            profile_type: m.profile_type || 'SILVER_JEWELRY',
            price: m.price,
            purity: m.purity,
            weight_grams: m.weight_grams,
            available_pieces: avail.map(sanitizeCashierPiece)
          };
        })
      };
      assertNoConfidentialFields(responsePayload);
      return NextResponse.json(responsePayload);
    }

    return NextResponse.json({ success: false, error: `No product or piece found matching "${clean}"` }, { status: 404 });
  } catch (err: unknown) {
    return handleApiAuthError(err);
  }
}
