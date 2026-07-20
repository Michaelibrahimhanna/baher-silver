'use client';

import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import { Input, Textarea, Select } from '@/components/admin/ui';

interface FormFieldProps {
  name: string;
  label: string;
  type?: 'text' | 'number' | 'email' | 'password' | 'textarea' | 'select';
  placeholder?: string;
  className?: string;
  options?: { label: string; value: string }[];
  helperText?: React.ReactNode;
}

export function FormField({ name, label, type = 'text', placeholder, className = '', options, helperText }: FormFieldProps) {
  const { register, formState: { errors } } = useFormContext();
  const error = errors[name]?.message as string;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex justify-between items-end">
        <label htmlFor={name} className="text-xs text-[#888888]">{label}</label>
        {helperText && <span className="text-[10px] text-[#555555]">{helperText}</span>}
      </div>
      
      {type === 'textarea' ? (
        <Textarea 
          id={name}
          placeholder={placeholder}
          {...register(name)}
          className={error ? 'border-red-500 focus:border-red-500' : ''}
        />
      ) : type === 'select' ? (
        <Select>
          {/* We use a custom Select wrapper in UI, might need to adapt it for react-hook-form */}
          <select 
            id={name}
            {...register(name)}
            className={`flex h-10 w-full appearance-none rounded-md border border-white/10 bg-[#121212] px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 transition-colors pr-8 ${error ? 'border-red-500 focus:border-red-500' : ''}`}
          >
            <option value="">Select...</option>
            {options?.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </Select>
      ) : (
        <Input 
          id={name}
          type={type}
          placeholder={placeholder}
          {...register(name)}
          className={error ? 'border-red-500 focus:border-red-500' : ''}
        />
      )}

      {error && <span className="text-xs text-red-400 mt-1">{error}</span>}
    </div>
  );
}
