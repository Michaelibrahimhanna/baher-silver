'use client';

import * as React from 'react';
import { Button, Toast } from '@/components/admin/ui';
import { Sparkles, Save, Eye, ArrowLeft, Upload, Trash2, GripVertical, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { useProduct, useCreateProduct, useUpdateProduct, useBrands, useMaterials } from '@/lib/hooks/useCatalog';
import { useProductMedia, useUploadProductMedia, useDeleteProductMedia, useSetPrimaryMedia } from '@/lib/hooks/useProductMedia';
import type { Product } from '@/types/catalog';
import { FormField } from '@/components/admin/forms/FormField';
import { AIAction } from '@/components/admin/AIAction';

// Validation Schema
const productSchema = z.object({
  name_en: z.string().min(2, 'Name must be at least 2 characters'),
  name_ar: z.string().optional(),
  slug: z.string().optional(),
  description_en: z.string().optional(),
  description_ar: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']),
  brand_id: z.string().uuid('Invalid Brand ID').optional().or(z.literal('')),
  material_id: z.string().uuid('Invalid Material ID').optional().or(z.literal('')),
});
type ProductFormData = z.infer<typeof productSchema>;

export default function ProductEditor() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const isNew = id === 'new';

  const { data: product, isLoading: isLoadingProduct } = useProduct(id);
  const { data: brands } = useBrands();
  const { data: materials } = useMaterials();
  const { data: mediaFiles } = useProductMedia(id);

  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const uploadMediaMutation = useUploadProductMedia();
  const deleteMediaMutation = useDeleteProductMedia();
  const setPrimaryMediaMutation = useSetPrimaryMedia();

  const [showToast, setShowToast] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState('');

  const methods = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name_en: '',
      name_ar: '',
      slug: '',
      description_en: '',
      description_ar: '',
      status: 'draft',
      brand_id: '',
      material_id: '',
    }
  });

  const { handleSubmit, reset, formState: { isDirty, isSubmitting, isValid } } = methods;

  React.useEffect(() => {
    if (product) {
      reset({
        name_en: product.name_en || '',
        name_ar: product.name_ar || '',
        slug: product.slug || '',
        description_en: product.description_en || '',
        description_ar: product.description_ar || '',
        status: product.status || 'draft',
        brand_id: product.brand_id || '',
        material_id: product.material_id || '',
      });
    }
  }, [product, reset]);

  // Handle unsaved changes warning natively
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const onSubmit = async (data: ProductFormData) => {
    // Transform empty strings to null for UUIDs
    const payload: Partial<Product> = {
      ...data,
      brand_id: data.brand_id || null,
      material_id: data.material_id || null,
    } as Partial<Product>;

    try {
      if (isNew) {
        const newProd = await createMutation.mutateAsync(payload);
        router.push(`/admin/catalog/products/${newProd.id}`);
      } else {
        await updateMutation.mutateAsync({ id, updates: payload });
        setToastMessage('Product saved successfully.');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
        reset(data, { keepValues: true }); // reset dirty state
      }
    } catch (err) {
      console.error(err);
      alert("Error saving product");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || isNew) return;
    const file = e.target.files[0];
    try {
      await uploadMediaMutation.mutateAsync({ 
        productId: id, 
        file, 
        isPrimary: mediaFiles?.length === 0 
      });
      setToastMessage('Media uploaded successfully.');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err) {
      console.error("Upload error", err);
      alert("Failed to upload media");
    }
  };

  if (isLoadingProduct && !isNew) return <div className="p-12 text-center text-[#888888]">Loading product data...</div>;

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="max-w-5xl mx-auto pb-32 animate-in fade-in duration-700 relative space-y-8">
        {showToast && (
          <div className="fixed bottom-6 right-6 z-50">
            <Toast title="Success" description={toastMessage} />
          </div>
        )}
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/admin/catalog/products" className="w-10 h-10 flex items-center justify-center rounded-full border border-white/10 hover:bg-white/5 transition-colors text-white">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-serif text-white">{isNew ? 'New Product' : product?.name_en || 'Untitled Product'}</h1>
              <div className="flex items-center gap-3 mt-1 text-sm text-[#888888]">
                <span>{product?.status || 'Draft'} Mode</span>
                {isDirty && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-orange-500"></span>
                    <span className="text-orange-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Unsaved changes</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" className="gap-2" type="button"><Eye className="w-4 h-4" /> Preview</Button>
            <Button 
              type="submit"
              variant="primary" 
              className="gap-2" 
              disabled={isSubmitting || (isNew && !isValid)}
            >
              <Save className="w-4 h-4" /> 
              {isSubmitting ? 'Saving...' : 'Save Product'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#121212] border border-white/5 rounded-lg p-6 space-y-6">
              <h3 className="text-white font-medium mb-4">General Information</h3>
              
              <div className="flex gap-2 items-end">
                <FormField name="name_en" label="Product Name (English)" className="flex-1" />
                <AIAction actionName="Generate Title" context={{ type: "name", current: methods.getValues('name_en') }} size="icon" />
              </div>

              <div className="flex gap-2 items-end">
                <FormField name="description_en" label="Description (English)" type="textarea" className="flex-1" />
                <AIAction actionName="Generate Description" context={{ type: "description", name: methods.getValues('name_en') }} size="icon" />
              </div>
            </div>

            {!isNew && (
              <div className="bg-[#121212] border border-white/5 rounded-lg p-6 space-y-6">
                <h3 className="text-white font-medium mb-4">Product Media</h3>
                
                {/* Media Grid */}
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                  {mediaFiles?.map((media) => (
                    <div key={media.id} className="relative group aspect-square rounded-lg border border-white/10 bg-[#0A0A0A] overflow-hidden">
                      {media.media_type === 'image' ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={media.storage_path} alt="Product media" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-[#888888]">Video</div>
                      )}
                      
                      {media.is_primary && (
                        <div className="absolute top-2 left-2 bg-white text-black text-[10px] font-bold px-2 py-0.5 rounded-sm z-10">
                          PRIMARY
                        </div>
                      )}
                      
                      {/* Overlay actions */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                        <div className="flex justify-between">
                          <button type="button" className="text-white/70 hover:text-white cursor-grab">
                            <GripVertical className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => deleteMediaMutation.mutate(media)} className="text-red-400 hover:text-red-300">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        {!media.is_primary && (
                          <button 
                            type="button" 
                            onClick={() => setPrimaryMediaMutation.mutate({ productId: id, mediaId: media.id })}
                            className="text-xs bg-white/20 text-white rounded py-1 px-2 hover:bg-white/30 transition-colors"
                          >
                            Set Primary
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  <label className="aspect-square rounded-lg border-2 border-dashed border-white/10 flex flex-col items-center justify-center text-[#555555] hover:bg-white/5 hover:border-white/20 transition-colors cursor-pointer">
                    {uploadMediaMutation.isPending ? (
                      <div className="text-xs">Uploading...</div>
                    ) : (
                      <>
                        <Upload className="w-6 h-6 mb-2" />
                        <span className="text-xs">Upload</span>
                      </>
                    )}
                    <input type="file" className="hidden" accept="image/*,video/*" onChange={handleFileUpload} />
                  </label>
                </div>
                {isNew && <p className="text-xs text-orange-400 mt-2">Save the product first before uploading media.</p>}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-[#121212] border border-white/5 rounded-lg p-6 space-y-6">
              <h3 className="text-white font-medium mb-4">Status & Taxonomy</h3>
              
              <FormField 
                name="status" 
                label="Product Status" 
                type="select" 
                options={[
                  { label: 'Draft', value: 'draft' },
                  { label: 'Published', value: 'published' },
                  { label: 'Archived', value: 'archived' },
                ]} 
              />
              
              <FormField 
                name="brand_id" 
                label="Brand" 
                type="select" 
                options={brands?.map(b => ({ label: b.name_en || b.id, value: b.id })) || []} 
              />
              
              <FormField 
                name="material_id" 
                label="Material" 
                type="select" 
                options={materials?.map(m => ({ label: m.name_en || m.id, value: m.id })) || []} 
              />
            </div>
            
            <div className="bg-gradient-to-b from-[#121212] to-[#0A0A0A] border border-white/10 rounded-lg p-6 relative overflow-hidden">
              <div className="flex items-center gap-3 mb-4 relative z-10">
                <Sparkles className="w-5 h-5 text-white" />
                <h3 className="text-white font-serif">Baher Brain</h3>
              </div>
              <p className="text-xs text-[#888888] mb-4 relative z-10">Use AI to automatically optimize this product for SEO and sales conversions.</p>
              <AIAction actionName="Optimize Product" context={{ productId: id }} className="w-full">
                Optimize Everything
              </AIAction>
            </div>
          </div>
        </div>
      </form>
    </FormProvider>
  );
}
