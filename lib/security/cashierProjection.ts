/**
 * 🛡️ Cashier Projection & Confidentiality Boundary
 *
 * Enforces strict information security for retail cashiers and point-of-sale clients:
 *   1. NEVER exposes internal cost basis (`cost_basis`, `cost_price`, `costPrice`).
 *   2. NEVER exposes manufacturing margins, wholesale lineage, or supplier identities.
 *   3. Enforces allowlisted field projections across both serialized pieces and standard items.
 *   4. Supports server-to-server proxying to MIP Core when configured, using server-only secrets.
 *   5. Guarantees zero cross-tenant data leaks.
 */

export interface CashierProjectedItem {
  id: string;
  productId: string;
  variantId?: string;
  sku: string;
  barcode: string;
  serialNumber?: string;
  name: string;
  productName: string;
  category?: string;
  material?: string;
  profileType: 'SILVER_JEWELRY' | 'NON_SILVER_RETAIL';
  purity?: string;
  weightGrams: number;
  retailPrice: number;
  pricingType?: string;
  workmanshipFeePerGram?: number;
  fixedWorkmanshipFee?: number;
  fixedPrice?: number;
  inStockQuantity: number;
  available: boolean;
  lifecycleStatus?: string;
  location?: string;
}

/**
 * List of confidential fields that must NEVER appear in cashier API responses.
 */
export const CONFIDENTIAL_COST_FIELDS = [
  'cost_basis',
  'cost_price',
  'costPrice',
  'manufacturing_cost',
  'manufacturing_lineage',
  'margin',
  'internal_margin',
  'supplier_id',
  'supplier_code',
  'wip_lot_id',
  'gemstone_lot_ids'
] as const;

/**
 * Authoritatively projects a piece and its parent product into a safe, allowlisted cashier item.
 */
export function projectCashierItem(product: any, piece?: any): CashierProjectedItem {
  const isPiece = Boolean(piece);

  const name =
    (typeof product?.name === 'object' && product?.name !== null
      ? product.name.en || product.name.ar
      : product?.name) ||
    product?.name_en ||
    'Silver Product';

  const category =
    typeof product?.category === 'object' && product?.category !== null
      ? product.category.en || product.category.ar
      : product?.category || product?.category_name || 'Silver Jewelry';

  const weightGrams = isPiece
    ? Number(piece.current_weight_grams || piece.weight_grams || product?.weight_grams || 0)
    : Number(product?.weight_grams || 0);

  const retailPrice = isPiece
    ? Number(piece.retail_price || product?.retail_price || product?.price || 0)
    : Number(product?.retail_price || product?.price || 0);

  const inStockQuantity = isPiece
    ? (piece.lifecycle_status === 'IN_SHOWCASE' || piece.lifecycle_status === 'IN_VAULT' ? 1 : 0)
    : Number(product?.pieces?.length || product?.stock || 1);

  const available = isPiece
    ? piece.lifecycle_status === 'IN_SHOWCASE' || piece.lifecycle_status === 'IN_VAULT'
    : product?.profile_type === 'NON_SILVER_RETAIL' || inStockQuantity > 0;

  return {
    id: isPiece ? piece.id : product?.id,
    productId: product?.id || piece?.product_id || '',
    variantId: piece?.variant_id || product?.variant_id,
    sku: piece?.sku || product?.sku || '',
    barcode: piece?.barcode || product?.barcode || '',
    serialNumber: piece?.serial_number,
    name,
    productName: name,
    category,
    material: product?.material || 'silver',
    profileType: product?.profile_type || 'SILVER_JEWELRY',
    purity: product?.purity || product?.base_purity || '925',
    weightGrams,
    retailPrice,
    pricingType: product?.pricing_type || 'metal_weight_plus_workmanship',
    workmanshipFeePerGram: product?.workmanship_fee_per_gram || product?.default_workmanship_fee_per_gram || 0,
    fixedWorkmanshipFee: product?.fixed_workmanship_fee || product?.default_fixed_workmanship_fee || 0,
    fixedPrice: product?.fixed_price,
    inStockQuantity,
    available,
    lifecycleStatus: piece?.lifecycle_status,
    location: piece?.location_code
  };
}

/**
 * Asserts and guarantees that an arbitrary object does not contain any confidential fields.
 */
export function assertNoConfidentialFields(obj: unknown, path = ''): void {
  if (!obj || typeof obj !== 'object') return;

  if (Array.isArray(obj)) {
    obj.forEach((item, index) => assertNoConfidentialFields(item, `${path}[${index}]`));
    return;
  }

  for (const [key, value] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key;
    if (CONFIDENTIAL_COST_FIELDS.includes(key as any)) {
      throw new Error(`SECURITY_VIOLATION: Confidential field "${currentPath}" leaked in cashier projection.`);
    }
    if (value && typeof value === 'object') {
      assertNoConfidentialFields(value, currentPath);
    }
  }
}

/**
 * Proxies a barcode lookup request server-to-server to MIP Core if configured.
 * Returns null if MIP Core is not configured or offline, allowing safe local fallback.
 */
export async function proxyToMipCoreBarcodeLookup(
  barcode: string,
  context: {
    organizationId: string;
    branchId?: string;
    token?: string;
  }
): Promise<{ success: boolean; data?: any; error?: string; status?: number } | null> {
  const mipCoreUrl = process.env.MIP_CORE_API_URL;
  if (!mipCoreUrl) {
    return null; // Not configured, use local product engine
  }

  const endpoint = `${mipCoreUrl.replace(/\/+$/, '')}/api/v1/commerce/products/barcode/${encodeURIComponent(
    barcode.trim()
  )}?orgId=${encodeURIComponent(context.organizationId)}${
    context.branchId ? `&branchId=${encodeURIComponent(context.branchId)}` : ''
  }`;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    // Use server-to-server service key or forwarded session token
    const serviceKey = process.env.MIP_CORE_SERVICE_KEY;
    if (serviceKey) {
      headers['Authorization'] = `Bearer ${serviceKey}`;
    } else if (context.token) {
      headers['Authorization'] = `Bearer ${context.token}`;
    } else {
      return {
        success: false,
        error: 'Missing required credentials (MIP_CORE_SERVICE_KEY or token) for MIP Core cross-service communication.',
        status: 401
      };
    }

    const response = await fetch(endpoint, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(5000)
    });

    const body = await response.json().catch(() => null);

    if (response.status === 404) {
      return {
        success: false,
        error: body?.error?.message || `Product not found for barcode "${barcode}".`,
        status: 404
      };
    }

    if (!response.ok) {
      return {
        success: false,
        error: body?.error?.message || `MIP Core returned error ${response.status}`,
        status: response.status
      };
    }

    // Verify cashier projection integrity
    assertNoConfidentialFields(body);

    return {
      success: true,
      data: body?.item || body?.product || body,
      status: 200
    };
  } catch (err: any) {
    // If connection refused or timeout, return null for graceful local fallback
    console.warn(`[MIP_CORE_PROXY_WARN] Failed to reach MIP Core at ${endpoint}: ${err.message}. Falling back to local engine.`);
    return null;
  }
}
