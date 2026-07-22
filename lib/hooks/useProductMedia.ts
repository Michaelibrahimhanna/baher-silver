import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

function getSupabase() {
  return createClient();
}

export interface ProductMedia {
  id: string;
  product_id: string;
  variant_id?: string | null;
  media_type: 'image' | 'video' | '360';
  storage_path: string;
  is_primary: boolean;
  sort_order: number;
  created_at: string;
}

// Get all media for a product
export function useProductMedia(productId: string) {
  return useQuery({
    queryKey: ['product_media', productId],
    queryFn: async () => {
      try {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('product_media')
          .select('*')
          .eq('product_id', productId)
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true });
        if (error) {
          console.warn('[Supabase Media] Product media fetch notice:', error.message);
          return [] as ProductMedia[];
        }
        return (data || []) as ProductMedia[];
      } catch (err) {
        console.warn('[Supabase Media] Product media query graceful fallback:', err);
        return [] as ProductMedia[];
      }
    },
    enabled: !!productId
  });
}

// Upload file to storage and create DB record
export function useUploadProductMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, file, isPrimary = false }: { productId: string, file: File, isPrimary?: boolean }) => {
      const supabase = getSupabase();
      const fileExt = file.name.split('.').pop();
      const fileName = `${productId}/${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${fileName}`;

      // 1. Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('product-media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('product-media')
        .getPublicUrl(filePath);

      // 3. Create DB record
      const { data, error: dbError } = await supabase
        .from('product_media')
        .insert({
          product_id: productId,
          media_type: file.type.startsWith('video') ? 'video' : 'image',
          storage_path: publicUrl,
          is_primary: isPrimary,
          sort_order: 0
        })
        .select()
        .single();

      if (dbError) throw dbError;
      return data as ProductMedia;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product_media', variables.productId] });
    }
  });
}

// Delete media
export function useDeleteProductMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (media: ProductMedia) => {
      const supabase = getSupabase();
      const bucketUrlPath = '/storage/v1/object/public/product-media/';
      const relativePath = media.storage_path.includes(bucketUrlPath) 
        ? media.storage_path.split(bucketUrlPath)[1]
        : media.storage_path;

      // 1. Delete from storage
      if (relativePath) {
        await supabase.storage.from('product-media').remove([relativePath]);
      }

      // 2. Delete from DB
      const { error } = await supabase.from('product_media').delete().eq('id', media.id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product_media', variables.product_id] });
    }
  });
}

// Set primary image
export function useSetPrimaryMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, mediaId }: { productId: string, mediaId: string }) => {
      const supabase = getSupabase();
      // 1. Unset all primary
      await supabase.from('product_media').update({ is_primary: false }).eq('product_id', productId);
      // 2. Set new primary
      const { data, error } = await supabase.from('product_media').update({ is_primary: true }).eq('id', mediaId).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product_media', variables.productId] });
    }
  });
}
