import * as React from 'react';
import { ChevronRight, Search, X, Check, Loader2, Info } from 'lucide-react';

export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' }>(({ className, variant = 'primary', ...props }, ref) => {
  const base = "inline-flex items-center justify-center text-sm font-medium transition-colors focus:outline-none disabled:opacity-50 disabled:pointer-events-none rounded-md px-4 py-2";
  const variants = {
    primary: "bg-white text-black hover:bg-white/90",
    secondary: "bg-white/10 text-white hover:bg-white/20 border border-white/5",
    ghost: "text-[#888888] hover:text-white hover:bg-white/5"
  };
  return <button ref={ref} className={`${base} ${variants[variant]} ${className}`} {...props} />;
});
Button.displayName = "Button";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input ref={ref} className={`flex h-10 w-full rounded-md border border-white/10 bg-[#121212] px-3 py-2 text-sm text-white placeholder:text-[#555555] focus:outline-none focus:border-white/30 transition-colors ${className}`} {...props} />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={`flex min-h-[80px] w-full rounded-md border border-white/10 bg-[#121212] px-3 py-2 text-sm text-white placeholder:text-[#555555] focus:outline-none focus:border-white/30 transition-colors ${className}`} {...props} />
));
Textarea.displayName = "Textarea";

export const Select = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={`relative ${className}`}>
    <select className="flex h-10 w-full appearance-none rounded-md border border-white/10 bg-[#121212] px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 transition-colors pr-8">
      {children}
    </select>
    <ChevronRight className="absolute right-3 top-3 w-4 h-4 text-[#555555] pointer-events-none rotate-90" />
  </div>
);

export const MultiSelect = () => (
  <div className="flex flex-wrap gap-2 p-2 border border-white/10 rounded-md bg-[#121212]">
    <Badge>Silver 925 <X className="w-3 h-3 ml-1 inline cursor-pointer hover:text-white" /></Badge>
    <Badge>Gold 18k <X className="w-3 h-3 ml-1 inline cursor-pointer hover:text-white" /></Badge>
    <input placeholder="Add more..." className="bg-transparent border-none outline-none text-sm text-white flex-1 min-w-[100px]" />
  </div>
);

export const Table = ({ children }: { children: React.ReactNode }) => (
  <div className="w-full overflow-auto border border-white/5 rounded-lg">
    <table className="w-full text-sm text-left text-[#888888]">
      {children}
    </table>
  </div>
);
export const Th = ({ children, className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) => <th className={`px-4 py-3 font-medium text-white bg-[#121212] border-b border-white/5 ${className || ''}`} {...props}>{children}</th>;
export const Td = ({ children, className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => <td className={`px-4 py-3 border-b border-white/5 bg-[#0A0A0A] ${className || ''}`} {...props}>{children}</td>;

export const DataCard = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <div className="bg-[#121212] border border-white/5 rounded-lg overflow-hidden">
    <div className="px-6 py-4 border-b border-white/5 bg-[#0A0A0A]/50">
      <h3 className="text-white font-medium">{title}</h3>
    </div>
    <div className="p-6">{children}</div>
  </div>
);

export const KPICard = ({ title, value, trend }: { title: string, value: string, trend?: string }) => (
  <div className="bg-[#121212] border border-white/5 rounded-lg p-6">
    <h3 className="text-xs tracking-widest uppercase text-[#888888] mb-2">{title}</h3>
    <div className="flex items-end justify-between">
      <p className="text-3xl font-serif text-white">{value}</p>
      {trend && <span className="text-xs text-green-400">{trend}</span>}
    </div>
  </div>
);

export const ChartPlaceholder = () => (
  <div className="h-64 w-full border border-dashed border-white/10 rounded-lg flex items-center justify-center text-[#555555]">
    Chart Visualization Area
  </div>
);

export const Badge = ({ children, variant = 'default' }: { children: React.ReactNode, variant?: 'default' | 'success' | 'warning' }) => {
  const variants = {
    default: "bg-white/10 text-white",
    success: "bg-green-500/10 text-green-400 border border-green-500/20",
    warning: "bg-orange-500/10 text-orange-400 border border-orange-500/20"
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${variants[variant]}`}>{children}</span>;
};

export const Pill = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white text-black">{children}</span>
);

export const EmptyState = ({ title, description }: { title: string, description: string }) => (
  <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-white/10 rounded-lg">
    <Info className="w-10 h-10 text-[#555555] mb-4" />
    <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
    <p className="text-sm text-[#888888] max-w-sm">{description}</p>
    <Button variant="secondary" className="mt-6">Add New</Button>
  </div>
);

export const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-white/5 rounded-md ${className}`} />
);

export const Toast = ({ title, description }: { title: string, description: string }) => (
  <div className="w-full max-w-sm bg-[#121212] border border-white/10 rounded-lg shadow-2xl p-4 flex gap-3">
    <div className="mt-0.5 text-green-400"><Check className="w-4 h-4" /></div>
    <div>
      <h4 className="text-sm text-white font-medium">{title}</h4>
      <p className="text-xs text-[#888888] mt-1">{description}</p>
    </div>
    <button className="ml-auto text-[#555555] hover:text-white"><X className="w-4 h-4" /></button>
  </div>
);

export const Tabs = () => (
  <div className="flex gap-6 border-b border-white/10">
    <button className="px-1 py-3 text-sm text-white border-b-2 border-white">Active Tab</button>
    <button className="px-1 py-3 text-sm text-[#888888] hover:text-white transition-colors">Inactive Tab</button>
  </div>
);

export const Breadcrumbs = () => (
  <div className="flex items-center gap-2 text-sm text-[#555555]">
    <span className="hover:text-white cursor-pointer">Catalog</span>
    <ChevronRight className="w-4 h-4" />
    <span className="hover:text-white cursor-pointer">Products</span>
    <ChevronRight className="w-4 h-4" />
    <span className="text-white">Elegance Ring</span>
  </div>
);

export const Pagination = () => (
  <div className="flex items-center justify-between px-4 py-3 bg-[#0A0A0A] border-t border-white/5">
    <p className="text-sm text-[#888888]">Showing <span className="text-white">1</span> to <span className="text-white">10</span> of <span className="text-white">97</span> results</p>
    <div className="flex gap-2">
      <Button variant="secondary" disabled>Previous</Button>
      <Button variant="secondary">Next</Button>
    </div>
  </div>
);

export const SearchComponent = () => (
  <div className="relative w-full max-w-sm">
    <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#555555]" />
    <Input placeholder="Search..." className="pl-9" />
  </div>
);

export const Filter = () => (
  <Button variant="secondary" className="gap-2">
    <span>Filter</span>
    <ChevronRight className="w-4 h-4 rotate-90" />
  </Button>
);

export const ModalPlaceholder = () => (
  <div className="relative w-full max-w-lg bg-[#121212] border border-white/10 rounded-lg shadow-2xl p-6">
    <h3 className="text-lg font-medium text-white mb-2">Are you absolutely sure?</h3>
    <p className="text-sm text-[#888888] mb-6">This action cannot be undone. This will permanently delete the product.</p>
    <div className="flex justify-end gap-3">
      <Button variant="ghost">Cancel</Button>
      <Button variant="primary">Confirm</Button>
    </div>
  </div>
);

export const DrawerPlaceholder = () => (
  <div className="h-96 w-80 bg-[#121212] border-l border-white/10 shadow-2xl p-6 flex flex-col justify-between ml-auto">
    <div>
      <h3 className="text-lg font-medium text-white mb-6">Quick Edit</h3>
      <div className="space-y-4">
        <div>
          <label className="text-xs text-[#888888] mb-1 block">Name</label>
          <Input defaultValue="Elegance Ring" />
        </div>
        <div>
          <label className="text-xs text-[#888888] mb-1 block">Price</label>
          <Input defaultValue="$1,200" />
        </div>
      </div>
    </div>
    <div className="flex gap-3 mt-8">
      <Button variant="ghost" className="flex-1">Cancel</Button>
      <Button variant="primary" className="flex-1">Save</Button>
    </div>
  </div>
);
