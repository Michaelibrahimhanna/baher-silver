import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SupplierService } from '../services/erp/SupplierService';
import { MaterialService } from '../services/erp/MaterialService';
import { BOMService } from '../services/erp/BOMService';
import { CostEngineService } from '../services/erp/CostEngineService';
import type { Supplier, VariantCost, CostCalculationHistory } from '@/types/erp';
import type { Material } from '@/types/catalog';

// --- Suppliers ---
export const useSuppliers = (options?: { page?: number; pageSize?: number; search?: string }) => {
  return useQuery({
    queryKey: ['suppliers', options],
    queryFn: () => SupplierService.getSuppliers(options),
  });
};

export const useSupplier = (id: string) => {
  return useQuery({
    queryKey: ['suppliers', id],
    queryFn: () => SupplierService.getSupplierById(id),
    enabled: !!id,
  });
};

export const useCreateSupplier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Supplier>) => SupplierService.createSupplier(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['suppliers'] }),
  });
};

export const useUpdateSupplier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Supplier> }) => SupplierService.updateSupplier(id, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers', id] });
    },
  });
};

// --- Materials (ERP Additions) ---
export const useMaterials = (options?: { page?: number; pageSize?: number; search?: string }) => {
  return useQuery({
    queryKey: ['materials', options],
    queryFn: () => MaterialService.getMaterials(options),
  });
};

export const useUpdateMaterial = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Material> }) => MaterialService.updateMaterial(id, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['materials', id] });
    },
  });
};

// --- BOM ---
export const useActiveBOM = (variantId: string) => {
  return useQuery({
    queryKey: ['boms', 'active', variantId],
    queryFn: () => BOMService.getActiveBOMForVariant(variantId),
    enabled: !!variantId,
  });
};

// --- Cost Engine ---
export const useCalculateCost = (variantId: string) => {
  return useQuery({
    queryKey: ['costEngine', 'calculate', variantId],
    queryFn: () => CostEngineService.calculateVariantCost(variantId),
    enabled: !!variantId,
  });
};

export const useSaveCalculationSnapshot = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CostCalculationHistory>) => CostEngineService.saveCalculationSnapshot(data),
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({ queryKey: ['costEngine', 'history', data.variant_id] });
    },
  });
};

export const useUpdateVariantCostConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ variantId, updates }: { variantId: string; updates: Partial<VariantCost> }) => CostEngineService.updateVariantCostConfig(variantId, updates),
    onSuccess: (_, { variantId }) => {
      queryClient.invalidateQueries({ queryKey: ['costEngine', 'calculate', variantId] });
    },
  });
};
