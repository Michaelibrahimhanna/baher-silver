import type { Product } from '@/types/catalog';

export type FileFormat = 'csv' | 'xlsx' | 'json';

export interface ExportContractOptions {
  format: FileFormat;
  includeVariants: boolean;
  includeMediaUrls: boolean;
  includeActivityLogs: boolean;
  statusFilter?: string[];
  categoryFilter?: string[];
}

export interface ImportValidationResult {
  isValid: boolean;
  totalRows: number;
  validRowsCount: number;
  invalidRowsCount: number;
  errors: { row: number; field: string; message: string }[];
  parsedProducts: Partial<Product>[];
}

/**
 * Catalog Data Exporter Contract
 */
export function exportCatalogDataContract(products: Product[], options: ExportContractOptions): { filename: string; mimeType: string; data: string } {
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `baher_silver_catalog_export_${timestamp}.${options.format}`;
  
  if (options.format === 'json') {
    return {
      filename,
      mimeType: 'application/json',
      data: JSON.stringify(products, null, 2)
    };
  }

  // CSV Contract
  const headers = ['ID', 'SKU', 'Barcode', 'Name EN', 'Name AR', 'Category', 'Material', 'Weight (g)', 'Cost (EGP)', 'Price (EGP)', 'Stock', 'Status'];
  const rows = products.map(p => [
    p.id,
    p.sku,
    p.barcode || '',
    `"${p.name_en.replace(/"/g, '""')}"`,
    `"${p.name_ar.replace(/"/g, '""')}"`,
    p.category_name || '',
    p.material_name || '',
    p.total_weight_g || p.silver_weight_g || 0,
    p.purchase_cost || 0,
    p.selling_price || 0,
    p.current_stock || 0,
    p.status
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

  return {
    filename,
    mimeType: 'text/csv;charset=utf-8;',
    data: csvContent
  };
}

/**
 * Catalog Data Importer Contract Parser
 */
export function validateAndParseImportContract(rawPayload: string, format: FileFormat): ImportValidationResult {
  const errors: { row: number; field: string; message: string }[] = [];
  const parsedProducts: Partial<Product>[] = [];

  if (format === 'json') {
    try {
      const parsed = JSON.parse(rawPayload);
      const list = Array.isArray(parsed) ? parsed : [parsed];

      list.forEach((item, idx) => {
        if (!item.name_en && !item.name_ar) {
          errors.push({ row: idx + 1, field: 'name', message: 'Product name is required' });
        } else {
          parsedProducts.push(item);
        }
      });
    } catch {
      errors.push({ row: 0, field: 'file', message: 'Invalid JSON payload' });
    }
  }

  return {
    isValid: errors.length === 0,
    totalRows: parsedProducts.length + errors.length,
    validRowsCount: parsedProducts.length,
    invalidRowsCount: errors.length,
    errors,
    parsedProducts,
  };
}
