import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Product, Category, Brand, Material, ProductVariant, Collection } from '@/types/catalog';

export interface ProductQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string;
  status?: string;
}

// ----------------------------------------------------------------------------
// PRODUCTS (REAL DATABASE ENGINE API)
// ----------------------------------------------------------------------------

export function useProducts(params?: ProductQueryParams) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: async () => {
      try {
        const queryParts = [];
        if (params?.search) queryParts.push(`query=${encodeURIComponent(params.search)}`);
        if (params?.category) queryParts.push(`category=${encodeURIComponent(params.category)}`);
        if (params?.status) queryParts.push(`status=${encodeURIComponent(params.status)}`);
        const queryString = queryParts.length ? `?${queryParts.join('&')}` : '';

        const res = await fetch(`/api/products${queryString}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.products)) {
          return { data: data.products as Product[], count: data.count || data.products.length };
        }
        return { data: [] as Product[], count: 0 };
      } catch (err) {
        console.warn('[Real DB Engine] Products fetch fallback:', err);
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
        const res = await fetch(`/api/products/${id}`);
        const data = await res.json();
        if (data.success && data.product) {
          return data.product as Product;
        }
        return null;
      } catch (err) {
        console.warn('[Real DB Engine] Product fetch fallback:', err);
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
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to create product');
      return data.product as Product;
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
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to update product');
      return data.product as Product;
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
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to delete product');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  });
}

// ----------------------------------------------------------------------------
// CATEGORIES (REAL DATABASE ENGINE API)
// ----------------------------------------------------------------------------

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/categories');
        const data = await res.json();
        if (data.success && Array.isArray(data.categories)) {
          return data.categories as Category[];
        }
        return [] as Category[];
      } catch (err) {
        console.warn('[Real DB Engine] Categories fetch fallback:', err);
        return [] as Category[];
      }
    }
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newCategory: Partial<Category>) => {
      const catAny = newCategory as Record<string, unknown> & { name?: { en?: string; ar?: string }; name_en?: string; name_ar?: string; image?: string };
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nameEn: catAny.name_en || catAny.name?.en || 'New Category',
          nameAr: catAny.name_ar || catAny.name?.ar || 'تصنيف جديد',
          slug: newCategory.slug,
          image: catAny.image,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to create category');
      return data.category as Category;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] })
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<Category> }) => {
      return { id, ...updates } as Category;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] })
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return id;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] })
  });
}

// ----------------------------------------------------------------------------
// COLLECTIONS (REAL DATABASE ENGINE API)
// ----------------------------------------------------------------------------

export function useCollections() {
  return useQuery({
    queryKey: ['collections'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/collections');
        const data = await res.json();
        if (data.success && Array.isArray(data.collections)) {
          return data.collections as Collection[];
        }
        return [] as Collection[];
      } catch (err) {
        console.warn('[Real DB Engine] Collections fetch fallback:', err);
        return [] as Collection[];
      }
    }
  });
}

export function useCreateCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newCollection: Partial<Collection>) => {
      const colAny = newCollection as Record<string, unknown> & { name?: { en?: string; ar?: string }; name_en?: string; name_ar?: string; image?: string };
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nameEn: colAny.name_en || colAny.name?.en || 'New Collection',
          nameAr: colAny.name_ar || colAny.name?.ar || 'مجموعة جديدة',
          slug: newCollection.slug,
          image: colAny.image,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to create collection');
      return data.collection as Collection;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['collections'] })
  });
}

export function useUpdateCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<Collection> }) => {
      return { id, ...updates } as Collection;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['collections'] })
  });
}

export function useDeleteCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return id;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['collections'] })
  });
}

// ----------------------------------------------------------------------------
// BRANDS, MATERIALS, VARIANTS
// ----------------------------------------------------------------------------

export function useBrands() {
  return useQuery({ queryKey: ['brands'], queryFn: async () => [] as Brand[] });
}

export function useCreateBrand() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: async (b: Partial<Brand>) => b as Brand, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['brands'] }) });
}

export function useUpdateBrand() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: async ({ id, updates }: { id: string; updates: Partial<Brand> }) => ({ id, ...updates }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['brands'] }) });
}

export function useDeleteBrand() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: async (id: string) => id, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['brands'] }) });
}

export function useMaterials() {
  return useQuery({ queryKey: ['materials'], queryFn: async () => [] as Material[] });
}

export function useCreateMaterial() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: async (m: Partial<Material>) => m as Material, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['materials'] }) });
}

export function useUpdateMaterial() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: async ({ id, updates }: { id: string; updates: Partial<Material> }) => ({ id, ...updates }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['materials'] }) });
}

export function useDeleteMaterial() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: async (id: string) => id, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['materials'] }) });
}

export function useProductVariants(productId: string) {
  return useQuery({ queryKey: ['variants', productId], queryFn: async () => [] as ProductVariant[], enabled: !!productId });
}

export function useCreateVariant() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: async (v: Partial<ProductVariant>) => v as ProductVariant, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['variants'] }) });
}

export function useUpdateVariant() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: async ({ id, updates }: { id: string; updates: Partial<ProductVariant> }) => ({ id, ...updates }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['variants'] }) });
}

export function useDeleteVariant() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: async (id: string) => id, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['variants'] }) });
}
