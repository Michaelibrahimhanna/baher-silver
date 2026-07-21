'use client';
import { GenericCrudPage } from '@/components/admin/crud/GenericCrudPage';
import { useCollections, useCreateCollection, useUpdateCollection, useDeleteCollection } from '@/lib/hooks/useCatalog';

export default function CollectionsPage() {
  const { data = [], isLoading } = useCollections();
  const createMutation = useCreateCollection();
  const updateMutation = useUpdateCollection();
  const deleteMutation = useDeleteCollection();

  return (
    <GenericCrudPage
      title="Collections"
      description="Manage seasonal campaigns and curated groups."
      entityName="Collection"
      data={data}
      isLoading={isLoading}
      createMutation={createMutation}
      updateMutation={updateMutation}
      deleteMutation={deleteMutation}
    />
  );
}
