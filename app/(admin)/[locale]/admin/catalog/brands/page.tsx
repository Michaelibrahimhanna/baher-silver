'use client';
import { GenericCrudPage } from '@/components/admin/crud/GenericCrudPage';
import { useBrands, useCreateBrand, useUpdateBrand, useDeleteBrand } from '@/lib/hooks/useCatalog';

export default function BrandsPage() {
  const { data = [], isLoading } = useBrands();
  const createMutation = useCreateBrand();
  const updateMutation = useUpdateBrand();
  const deleteMutation = useDeleteBrand();

  return (
    <GenericCrudPage
      title="Brands"
      description="Manage manufacturers and internal product lines."
      entityName="Brand"
      data={data}
      isLoading={isLoading}
      createMutation={createMutation}
      updateMutation={updateMutation}
      deleteMutation={deleteMutation}
    />
  );
}
