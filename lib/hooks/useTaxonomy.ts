import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

function getSupabase() {
  return createClient();
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      try {
        const supabase = getSupabase();
        const { data, error } = await supabase.from('categories').select('*').order('name_en');
        if (error) {
          console.warn('[Supabase Taxonomy] Categories fetch notice:', error.message);
          return [];
        }
        return data || [];
      } catch (err) {
        console.warn('[Supabase Taxonomy] Categories query graceful fallback:', err);
        return [];
      }
    }
  });
}

export function useBrands() {
  return useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      try {
        const supabase = getSupabase();
        const { data, error } = await supabase.from('brands').select('*').order('name_en');
        if (error) {
          console.warn('[Supabase Taxonomy] Brands fetch notice:', error.message);
          return [];
        }
        return data || [];
      } catch (err) {
        console.warn('[Supabase Taxonomy] Brands query graceful fallback:', err);
        return [];
      }
    }
  });
}

export function useMaterials() {
  return useQuery({
    queryKey: ['materials'],
    queryFn: async () => {
      try {
        const supabase = getSupabase();
        const { data, error } = await supabase.from('materials').select('*').order('name_en');
        if (error) {
          console.warn('[Supabase Taxonomy] Materials fetch notice:', error.message);
          return [];
        }
        return data || [];
      } catch (err) {
        console.warn('[Supabase Taxonomy] Materials query graceful fallback:', err);
        return [];
      }
    }
  });
}

export function useCollections() {
  return useQuery({
    queryKey: ['collections'],
    queryFn: async () => {
      try {
        const supabase = getSupabase();
        const { data, error } = await supabase.from('collections').select('*').order('name_en');
        if (error) {
          console.warn('[Supabase Taxonomy] Collections fetch notice:', error.message);
          return [];
        }
        return data || [];
      } catch (err) {
        console.warn('[Supabase Taxonomy] Collections query graceful fallback:', err);
        return [];
      }
    }
  });
}
