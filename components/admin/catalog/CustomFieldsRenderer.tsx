'use client';

import * as React from 'react';
import type { CustomFieldDefinition, ProductCustomFieldValue } from '@/types/catalog';

interface Props {
  definitions: CustomFieldDefinition[];
  values: ProductCustomFieldValue[];
  onChange: (updatedValues: ProductCustomFieldValue[]) => void;
}

export function CustomFieldsRenderer({ definitions, values, onChange }: Props) {
  const getValue = (key: string, defaultVal?: string) => {
    const found = values.find(v => v.key === key);
    return found !== undefined ? String(found.value) : (defaultVal || '');
  };

  const handleFieldChange = (field: CustomFieldDefinition, val: string) => {
    const existingIdx = values.findIndex(v => v.key === field.key);
    const updated = [...values];
    
    let typedVal: string | number | boolean = val;
    if (field.field_type === 'number') typedVal = Number(val) || 0;
    if (field.field_type === 'boolean') typedVal = val === 'true';

    if (existingIdx >= 0) {
      updated[existingIdx] = { field_id: field.id, key: field.key, value: typedVal };
    } else {
      updated.push({ field_id: field.id, key: field.key, value: typedVal });
    }
    onChange(updated);
  };

  return (
    <div className="space-y-4 rounded-xl border border-white/10 bg-black/40 p-5 backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber-400"></span>
          الحقول المخصصة الديناميكية (Dynamic Custom Fields)
        </h3>
        <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400 border border-amber-500/20">
          Enterprise Engine
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {definitions.map((def) => {
          const currentVal = getValue(def.key, def.default_value);
          return (
            <div key={def.id} className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">
                {def.label_ar} <span className="text-slate-500">({def.label_en})</span>
                {def.is_required && <span className="text-red-400 ml-1">*</span>}
              </label>

              {def.field_type === 'select' ? (
                <select
                  value={currentVal}
                  onChange={(e) => handleFieldChange(def, e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                >
                  <option value="">إختر القيمة...</option>
                  {(def.options || []).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : def.field_type === 'number' ? (
                <input
                  type="number"
                  value={currentVal}
                  placeholder={def.placeholder_ar || def.label_ar}
                  onChange={(e) => handleFieldChange(def, e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                />
              ) : (
                <input
                  type="text"
                  value={currentVal}
                  placeholder={def.placeholder_ar || def.label_ar}
                  onChange={(e) => handleFieldChange(def, e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
