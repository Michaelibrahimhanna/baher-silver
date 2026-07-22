import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Product, Category, Brand, Material, ProductVariant, Collection } from '@/types/catalog';

function getSupabase() {
  return createClient();
}

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
      try {
        const supabase = getSupabase();
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
        if (error) {
          console.warn('[Supabase Catalog] Products fetch notice:', error.message);
          return { data: [] as Product[], count: 0 };
        }
        return { data: (data || []) as Product[], count: count || 0 };
      } catch (err) {
        console.warn('[Supabase Catalog] Products query graceful fallback:', err);
        return { data: [] as Product[], count: 0 };
      }
    }
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      if (id === 'new') return null;
      try {
        const supabase = getSupabase();
        const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
        if (error) {
          console.warn('[Supabase Catalog] Product fetch notice:', error.message);
          return null;
        }
        return data as Product;
      } catch (err) {
        console.warn('[Supabase Catalog] Product fetch graceful fallback:', err);
        return null;
      }
    },
    enabled: !!id
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newProduct: Partial<Product>) => {
      const supabase = getSupabase();
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
      const supabase = getSupabase();
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
      const supabase = getSupabase();
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
      try {
        const supabase = getSupabase();
        const { data, error } = await supabase.from('categories').select('*').is('deleted_at', null).order('created_at', { ascending: false });
        if (error) {
          console.warn('[Supabase Catalog] Categories fetch notice:', error.message);
          return [] as Category[];
        }
        return (data || []) as Category[];
      } catch (err) {
        console.warn('[Supabase Catalog] Categories query graceful fallback:', err);
        return [] as Category[];
      }
    }
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newCategory: Partial<Category>) => {
      const supabase = getSupabase();
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
      const supabase = getSupabase();
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
      const supabase = getSupabase();
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
      try {
        const supabase = getSupabase();
        const { data, error } = await supabase.from('brands').select('*').is('deleted_at', null).order('created_at', { ascending: false });
        if (error) {
          console.warn('[Supabase Catalog] Brands fetch notice:', error.message);
          return [] as Brand[];
        }
        return (data || []) as Brand[];
      } catch (err) {
        console.warn('[Supabase Catalog] Brands query graceful fallback:', err);
        return [] as Brand[];
      }
    }
  });
}

export function useCreateBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newBrand: Partial<Brand>) => {
      const supabase = getSupabase();
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
      const supabase = getSupabase();
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
      const supabase = getSupabase();
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
      try {
        const supabase = getSupabase();
        const { data, error } = await supabase.from('materials').select('*').is('deleted_at', null).order('created_at', { ascending: false });
        if (error) {
          console.warn('[Supabase Catalog] Materials fetch notice:', error.message);
          return [] as Material[];
        }
        return (data || []) as Material[];
      } catch (err) {
        console.warn('[Supabase Catalog] Materials query graceful fallback:', err);
        return [] as Material[];
      }
    }
  });
}

export function useCreateMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newMaterial: Partial<Material>) => {
      const supabase = getSupabase();
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
      const supabase = getSupabase();
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
      const supabase = getSupabase();
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
      try {
        const supabase = getSupabase();
        const { data, error } = await supabase.from('collections').select('*').is('deleted_at', null).order('created_at', { ascending: false });
        if (error) {
          console.warn('[Supabase Catalog] Collections fetch notice:', error.message);
          return [] as Collection[];
        }
        return (data || []) as Collection[];
      } catch (err) {
        console.warn('[Supabase Catalog] Collections query graceful fallback:', err);
        return [] as Collection[];
      }
    }
  });
}

export function useCreateCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newCollection: Partial<Collection>) => {
      const supabase = getSupabase();
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
      const supabase = getSupabase();
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
      const supabase = getSupabase();
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
      try {
        const supabase = getSupabase();
        const { data, error } = await supabase.from('product_variants').select('*').eq('product_id', productId).is('deleted_at', null).order('created_at', { ascending: false });
        if (error) {
          console.warn('[Supabase Catalog] Variants fetch notice:', error.message);
          return [] as ProductVariant[];
        }
        return (data || []) as ProductVariant[];
      } catch (err) {
        console.warn('[Supabase Catalog] Variants query graceful fallback:', err);
        return [] as ProductVariant[];
      }
    },
    enabled: !!productId
  });
}

export function useCreateVariant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newVariant: Partial<ProductVariant>) => {
      const supabase = getSupabase();
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
      const supabase = getSupabase();
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
      const supabase = getSupabase();
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
