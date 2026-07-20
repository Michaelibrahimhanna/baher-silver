'use client';
import { GenericCrudPage } from '@/components/admin/crud/GenericCrudPage';
import { useMaterials, useCreateMaterial, useUpdateMaterial, useDeleteMaterial } from '@/lib/hooks/useCatalog';

export default function MaterialsPage() {
  const { data = [], isLoading } = useMaterials();
  const createMutation = useCreateMaterial();
  const updateMutation = useUpdateMaterial();
  const deleteMutation = useDeleteMaterial();

  return (
    <GenericCrudPage
      title="Materials"
      description="Manage raw materials and compositions (e.g. Silver 925, Gold 18K)."
      entityName="Material"
      data={data}
      isLoading={isLoading}
      createMutation={createMutation}
      updateMutation={updateMutation}
      deleteMutation={deleteMutation}
    />
  );
}
