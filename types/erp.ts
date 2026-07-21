export type MaterialType = 'raw_material' | 'packaging' | 'consumable';
export type MaterialUnit = 'g' | 'kg' | 'piece';
export type CostType = 'standard' | 'market' | 'purchase' | 'average';

export interface Supplier {
  id: string;
  code: string;
  name: string;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  currency: string;
  tax_number?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  payment_terms?: string | null;
  lead_time_days: number;
  rating: number;
  notes?: string | null;
  is_active: boolean;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface MaterialCostHistory {
  id: string;
  material_id: string;
  cost: number;
  cost_type: CostType;
  reason?: string | null;
  supplier_id?: string | null;
  purchase_order_id?: string | null;
  changed_by?: string | null;
  effective_from: string;
  created_at?: string;
}

export interface BOM {
  id: string;
  variant_id: string;
  version: number;
  effective_from: string;
  effective_to?: string | null;
  is_active: boolean;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  
  // Relations
  items?: BOMItem[];
}

export interface BOMItem {
  id: string;
  bom_id: string;
  material_id: string;
  quantity: number;
  expected_waste: number;
  actual_waste: number;
  created_at?: string;
  updated_at?: string;
  
  // Relations
  material?: unknown; // To be populated with Material
}

export interface VariantCost {
  variant_id: string;
  labor_cost: number;
  manufacturing_cost: number;
  packaging_cost: number;
  overhead_cost: number;
  tax_rate: number;
  discount_rate: number;
  profit_margin_target: number;
  created_at?: string;
  updated_at?: string;
}

export interface CostCalculationHistory {
  id: string;
  variant_id: string;
  bom_id?: string | null;
  material_cost: number;
  labor_cost: number;
  manufacturing_cost: number;
  packaging_cost: number;
  waste_cost: number;
  overhead_cost: number;
  tax_amount: number;
  discount_amount: number;
  profit_margin: number;
  final_selling_price: number;
  calculated_by?: string | null;
  calculated_at: string;
}
