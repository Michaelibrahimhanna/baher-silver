import { Product } from '@/types/catalog';

/**
 * Soft Delete & Recycle Bin Service
 * Handles soft deletion, restoration, and active vs soft-deleted product filtering.
 */

export function softDeleteProduct(product: Product): Product {
  const timestamp = new Date().toISOString();
  return {
    ...product,
    is_soft_deleted: true,
    deleted_at: timestamp,
    status: 'archived',
    updated_at: timestamp,
    activity_logs: [
      {
        id: `log-softdelete-${Date.now()}`,
        product_id: product.id,
        actor_name: 'Administrator',
        actor_role: 'Admin',
        action_type: 'status_change',
        description_ar: 'تم نقل المنتج إلى سلة المحذوفات (Soft Delete / Recycle Bin).',
        description_en: 'Moved product to Recycle Bin (Soft Delete).',
        created_at: timestamp,
      },
      ...(product.activity_logs || []),
    ],
  };
}

export function restoreProductFromRecycleBin(product: Product): Product {
  const timestamp = new Date().toISOString();
  return {
    ...product,
    is_soft_deleted: false,
    deleted_at: null,
    status: 'draft',
    updated_at: timestamp,
    activity_logs: [
      {
        id: `log-restore-${Date.now()}`,
        product_id: product.id,
        actor_name: 'Administrator',
        actor_role: 'Admin',
        action_type: 'status_change',
        description_ar: 'تم استعادة المنتج بنجاح من سلة المحذوفات.',
        description_en: 'Restored product from Recycle Bin successfully.',
        created_at: timestamp,
      },
      ...(product.activity_logs || []),
    ],
  };
}

export function filterActiveProducts(products: Product[]): Product[] {
  return products.filter((p) => !p.is_soft_deleted && p.deleted_at === null);
}

export function filterSoftDeletedProducts(products: Product[]): Product[] {
  return products.filter((p) => p.is_soft_deleted || p.deleted_at !== null);
}
