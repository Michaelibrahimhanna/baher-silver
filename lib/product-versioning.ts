import { Product, ProductVersion } from '@/types/catalog';

/**
 * Product Version History Engine
 * Manages immutability snapshots of product records per save.
 */
export function createProductVersionSnapshot(
  product: Product,
  createdBy: string = 'Admin User',
  changeSummary: string = 'Manual save version snapshot'
): ProductVersion {
  const versions = product.version_history || [];
  const nextVersionNumber = versions.length + 1;

  const version: ProductVersion = {
    version_id: `v${nextVersionNumber}_${Date.now()}`,
    product_id: product.id,
    version_number: nextVersionNumber,
    snapshot: JSON.parse(JSON.stringify(product)),
    created_at: new Date().toISOString(),
    created_by: createdBy,
    change_summary: changeSummary,
  };

  return version;
}

export function restoreProductVersion(
  currentProduct: Product,
  targetVersionId: string
): Product {
  const versions = currentProduct.version_history || [];
  const foundVersion = versions.find((v) => v.version_id === targetVersionId);

  if (!foundVersion) {
    throw new Error(`Product version ${targetVersionId} not found`);
  }

  // Restore snapshot while keeping version history intact
  const restoredProduct: Product = {
    ...JSON.parse(JSON.stringify(foundVersion.snapshot)),
    version_history: currentProduct.version_history,
    updated_at: new Date().toISOString(),
  };

  return restoredProduct;
}
