import type { Product, ProductVariant } from '@/types/catalog';
import { generateSKU, generateEAN13Barcode, generateDualQRCodes, QRDestinationType } from './catalog-identifiers';

/**
 * Product Duplication Utility
 * Clones a product and all its variants, SEO, specifications, and attributes
 * without duplicating SKU or Barcode, generating fresh unique identifiers.
 */
export function duplicateProduct(sourceProduct: Product): Product {
  const timestamp = Date.now();
  const newId = `prod-dup-${timestamp}`;
  const newSlug = `${sourceProduct.slug}-copy-${Math.floor(100 + Math.random() * 900)}`;
  const newSku = generateSKU(sourceProduct.category_name || 'jew', 'SIL');
  const newBarcode = generateEAN13Barcode();
  const destType = (sourceProduct.qr_destination_type || 'product_page') as unknown as QRDestinationType;
  const dualQr = generateDualQRCodes(newSku, newSlug, destType);

  // Clone Variants with fresh SKUs and Barcodes
  const duplicatedVariants: ProductVariant[] = (sourceProduct.variants || []).map((v, idx) => {
    const varSku = `${newSku}-V${idx + 1}`;
    const varBarcode = generateEAN13Barcode(timestamp + idx);
    const varDualQr = generateDualQRCodes(varSku, newSlug, destType);

    return {
      ...v,
      id: `var-dup-${timestamp}-${idx}`,
      product_id: newId,
      sku: varSku,
      barcode: varBarcode,
      internal_qr: varDualQr.internal_qr.code,
      customer_qr: varDualQr.customer_qr.code,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  });

  return {
    ...sourceProduct,
    id: newId,
    slug: newSlug,
    sku: newSku,
    barcode: newBarcode,
    internal_qr: dualQr.internal_qr.code,
    customer_qr: dualQr.customer_qr.code,
    name_ar: `${sourceProduct.name_ar} (نسخة)`,
    name_en: `${sourceProduct.name_en} (Copy)`,
    status: 'draft', // duplicated items start as draft
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    variants: duplicatedVariants,
    activity_logs: [
      {
        id: `log-${Date.now()}`,
        product_id: newId,
        actor_name: 'Admin User',
        actor_role: 'Catalog Manager',
        action_type: 'duplicate',
        description_ar: `تمت ثنسخة جديدة من المنتج الأصل: ${sourceProduct.sku}`,
        description_en: `Duplicated product record from source SKU: ${sourceProduct.sku}`,
        created_at: new Date().toISOString(),
      }
    ]
  };
}
