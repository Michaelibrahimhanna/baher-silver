import { NextResponse } from 'next/server';
import { 
  MASTER_PURITY_LEVELS, 
  MASTER_STONE_TYPES, 
  MASTER_STONE_COLORS, 
  MASTER_FINISHES, 
  MASTER_SUPPLIERS, 
  MASTER_WAREHOUSES,
  CUSTOM_FIELD_DEFINITIONS,
  PRODUCT_TEMPLATES 
} from '@/lib/master-data';

export async function GET() {
  return NextResponse.json({
    success: true,
    masterData: {
      purities: MASTER_PURITY_LEVELS,
      stoneTypes: MASTER_STONE_TYPES,
      stoneColors: MASTER_STONE_COLORS,
      finishes: MASTER_FINISHES,
      suppliers: MASTER_SUPPLIERS,
      warehouses: MASTER_WAREHOUSES,
      customFields: CUSTOM_FIELD_DEFINITIONS,
      templates: PRODUCT_TEMPLATES,
    }
  });
}
