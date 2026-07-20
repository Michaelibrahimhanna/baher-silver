import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Product, Category, Brand, Material, ProductVariant, Collection } from '@/types/catalog';

const supabase = createClient();

// ----------------------------------------------------------------------------
// PRODUCTS
// ----------------------------------------------------------------------------

export interface ProductQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string;
  status?: string;
}

export function useProducts(params?: ProductQueryParams) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: async () => {
      let query = supabase.from('products').select(`
        *,
        brand:brands(name_en),
        material:materials(name_en)
      `, { count: 'exact' });

      query = query.is('deleted_at', null);
      
      if (params?.search) {
        query = query.ilike('name_en', `%${params.search}%`);
      }
      if (params?.status) {
        query = query.eq('status', params.status);
      }
      
      if (params?.page && params?.pageSize) {
        const from = (params.page - 1) * params.pageSize;
        const to = from + params.pageSize - 1;
        query = query.range(from, to);
      }

      query = query.order('created_at', { ascending: false });
      
      const { data, error, count } = await query;
      if (error) throw error;
      return { data: (data || []) as Product[], count: count || 0 };
    }
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      if (id === 'new') return null;
      const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
      if (error) throw error;
      return data as Product;
    },
    enabled: !!id
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newProduct: Partial<Product>) => {
      const { data, error } = await supabase.from('products').insert(newProduct).select().single();
      if (error) throw error;
      return data as Product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<Product> }) => {
      const { data, error } = await supabase.from('products').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data as Product;
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['product', id] });
      const previousProduct = queryClient.getQueryData(['product', id]);
      queryClient.setQueryData(['product', id], (old: Product | undefined) => (old ? { ...old, ...updates } : old));
      return { previousProduct };
    },
    onError: (err, newProd, context) => {
      if (context?.previousProduct) {
        queryClient.setQueryData(['product', newProd.id], context.previousProduct);
      }
    },
    onSettled: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      if (data) queryClient.invalidateQueries({ queryKey: ['product', data.id] });
    }
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  });
}

// ----------------------------------------------------------------------------
// CATEGORIES
// ----------------------------------------------------------------------------

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*').is('deleted_at', null).order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Category[];
    }
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newCategory: Partial<Category>) => {
      const { data, error } = await supabase.from('categories').insert(newCategory).select().single();
      if (error) throw error;
      return data as Category;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] })
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<Category> }) => {
      const { data, error } = await supabase.from('categories').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data as Category;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] })
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('categories').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] })
  });
}

// ----------------------------------------------------------------------------
// BRANDS
// ----------------------------------------------------------------------------

export function useBrands() {
  return useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const { data, error } = await supabase.from('brands').select('*').is('deleted_at', null).order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Brand[];
    }
  });
}

export function useCreateBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newBrand: Partial<Brand>) => {
      const { data, error } = await supabase.from('brands').insert(newBrand).select().single();
      if (error) throw error;
      return data as Brand;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['brands'] })
  });
}

export function useUpdateBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<Brand> }) => {
      const { data, error } = await supabase.from('brands').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data as Brand;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['brands'] })
  });
}

export function useDeleteBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('brands').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['brands'] })
  });
}

// ----------------------------------------------------------------------------
// MATERIALS
// ----------------------------------------------------------------------------

export function useMaterials() {
  return useQuery({
    queryKey: ['materials'],
    queryFn: async () => {
      const { data, error } = await supabase.from('materials').select('*').is('deleted_at', null).order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Material[];
    }
  });
}

export function useCreateMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newMaterial: Partial<Material>) => {
      const { data, error } = await supabase.from('materials').insert(newMaterial).select().single();
      if (error) throw error;
      return data as Material;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['materials'] })
  });
}

export function useUpdateMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<Material> }) => {
      const { data, error } = await supabase.from('materials').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data as Material;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['materials'] })
  });
}

export function useDeleteMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('materials').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['materials'] })
  });
}

// ----------------------------------------------------------------------------
// COLLECTIONS
// ----------------------------------------------------------------------------

export function useCollections() {
  return useQuery({
    queryKey: ['collections'],
    queryFn: async () => {
      const { data, error } = await supabase.from('collections').select('*').is('deleted_at', null).order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Collection[];
    }
  });
}

export function useCreateCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newCollection: Partial<Collection>) => {
      const { data, error } = await supabase.from('collections').insert(newCollection).select().single();
      if (error) throw error;
      return data as Collection;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['collections'] })
  });
}

export function useUpdateCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<Collection> }) => {
      const { data, error } = await supabase.from('collections').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data as Collection;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['collections'] })
  });
}

export function useDeleteCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('collections').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['collections'] })
  });
}

// ----------------------------------------------------------------------------
// VARIANTS
// ----------------------------------------------------------------------------

export function useProductVariants(productId: string) {
  return useQuery({
    queryKey: ['variants', productId],
    queryFn: async () => {
      const { data, error } = await supabase.from('product_variants').select('*').eq('product_id', productId).is('deleted_at', null).order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as ProductVariant[];
    },
    enabled: !!productId
  });
}

export function useCreateVariant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newVariant: Partial<ProductVariant>) => {
      const { data, error } = await supabase.from('product_variants').insert(newVariant).select().single();
      if (error) throw error;
      return data as ProductVariant;
    },
    onSuccess: (_, variables) => {
      if (variables.product_id) {
        queryClient.invalidateQueries({ queryKey: ['variants', variables.product_id] });
      }
    }
  });
}

export function useUpdateVariant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<ProductVariant> }) => {
      const { data, error } = await supabase.from('product_variants').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data as ProductVariant;
    },
    onSuccess: (data) => {
      if (data.product_id) {
        queryClient.invalidateQueries({ queryKey: ['variants', data.product_id] });
      }
    }
  });
}

export function useDeleteVariant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // get variant first to know product_id for invalidation, or rely on UI to refresh
      const { data } = await supabase.from('product_variants').select('product_id').eq('id', id).single();
      const { error } = await supabase.from('product_variants').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data?.product_id) {
        queryClient.invalidateQueries({ queryKey: ['variants', data.product_id] });
      }
    }
  });
}
