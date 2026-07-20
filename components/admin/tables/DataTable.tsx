'use client';

import * as React from 'react';
import { Search, Filter, Loader2, Info, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button, Input, Th, Td } from '@/components/admin/ui';

interface Column<T> {
  key: string;
  title: string;
  render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  isLoading?: boolean;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  emptyStateAction?: React.ReactNode;
  
  // Pagination
  currentPage?: number;
  totalPages?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;
  
  // Search
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  
  // Selection
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  bulkActions?: React.ReactNode;
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  isLoading,
  emptyStateTitle = "No data found",
  emptyStateDescription = "Get started by creating a new record.",
  emptyStateAction,
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  onPageChange,
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Search...",
  selectedIds = [],
  onSelectionChange,
  bulkActions
}: DataTableProps<T>) {
  const toggleAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked && onSelectionChange) {
      onSelectionChange(data.map(keyExtractor));
    } else if (onSelectionChange) {
      onSelectionChange([]);
    }
  };

  const toggleOne = (id: string) => {
    if (!onSelectionChange) return;
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter(x => x !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-[#121212] p-4 rounded-lg border border-white/5">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          {onSearchChange && (
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#555555]" />
              <Input 
                placeholder={searchPlaceholder} 
                className="pl-9"
                value={searchQuery || ''}
                onChange={e => onSearchChange(e.target.value)}
              />
            </div>
          )}
          {bulkActions && selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#888888]">{selectedIds.length} selected</span>
              {bulkActions}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button variant="secondary" className="gap-2">
            <Filter className="w-4 h-4" /> Filter
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="w-full overflow-auto border border-white/5 rounded-lg bg-[#121212]">
        <table className="w-full text-sm text-left text-[#888888]">
          <thead>
            <tr>
              {onSelectionChange && (
                <Th className="w-12 text-center">
                  <input 
                    type="checkbox" 
                    className="accent-white cursor-pointer"
                    checked={data.length > 0 && selectedIds.length === data.length}
                    onChange={toggleAll}
                  />
                </Th>
              )}
              {columns.map(col => (
                <Th key={col.key}>{col.title}</Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={columns.length + (onSelectionChange ? 1 : 0)} className="h-64 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#555555]" />
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (onSelectionChange ? 1 : 0)} className="h-64">
                  <div className="flex flex-col items-center justify-center text-center">
                    <Info className="w-10 h-10 text-[#555555] mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">{emptyStateTitle}</h3>
                    <p className="text-sm text-[#888888] max-w-sm">{emptyStateDescription}</p>
                    {emptyStateAction && <div className="mt-6">{emptyStateAction}</div>}
                  </div>
                </td>
              </tr>
            ) : (
              data.map(item => {
                const id = keyExtractor(item);
                const isSelected = selectedIds.includes(id);
                return (
                  <tr key={id} className={`hover:bg-[#1A1A1A] transition-colors ${isSelected ? 'bg-white/5' : 'bg-[#0A0A0A]'}`}>
                    {onSelectionChange && (
                      <Td className="text-center w-12 border-b border-white/5">
                        <input 
                          type="checkbox" 
                          className="accent-white cursor-pointer"
                          checked={isSelected}
                          onChange={() => toggleOne(id)}
                        />
                      </Td>
                    )}
                    {columns.map(col => (
                      <Td key={col.key} className="border-b border-white/5">
                        {col.render ? col.render(item) : ((item as Record<string, unknown>)[col.key] as React.ReactNode)}
                      </Td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!isLoading && data.length > 0 && onPageChange && (
        <div className="flex items-center justify-between px-4 py-3 bg-[#121212] border border-white/5 rounded-lg">
          <p className="text-sm text-[#888888]">
            Showing <span className="text-white">{data.length}</span> items 
            {totalItems > 0 && <span> of <span className="text-white">{totalItems}</span></span>}
          </p>
          <div className="flex gap-2 items-center">
            <span className="text-xs text-[#555555] mr-2">Page {currentPage} of {totalPages}</span>
            <Button 
              variant="secondary" 
              disabled={currentPage <= 1} 
              onClick={() => onPageChange(currentPage - 1)}
              className="px-2"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button 
              variant="secondary" 
              disabled={currentPage >= totalPages} 
              onClick={() => onPageChange(currentPage + 1)}
              className="px-2"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
