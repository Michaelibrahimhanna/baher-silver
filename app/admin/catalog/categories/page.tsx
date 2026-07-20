'use client';
import { GenericCrudPage } from '@/components/admin/crud/GenericCrudPage';
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from '@/lib/hooks/useCatalog';

export default function CategoriesPage() {
  const { data = [], isLoading } = useCategories();
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  return (
    <GenericCrudPage
      title="Categories"
      description="Manage the main navigation hierarchy."
      entityName="Category"
      data={data}
      isLoading={isLoading}
      createMutation={createMutation}
      updateMutation={updateMutation}
      deleteMutation={deleteMutation}
    />
  );
}
