export const metadata = {
  title: 'Baher OS | Mission Control',
};

export default function MissionControl() {
  return (
    <div className="space-y-8 animate-in fade-in duration-700 relative">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-serif text-white tracking-tight">Mission Control</h1>
          <p className="text-[#888888] font-light mt-1">System status, vital metrics, and intelligence overview.</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#121212] border border-white/5 p-6 rounded-lg">
          <h3 className="text-xs tracking-widest uppercase text-[#888888] mb-2">Today&apos;s Revenue</h3>
          <p className="text-3xl font-serif text-white">$14,250</p>
        </div>
        <div className="bg-[#121212] border border-white/5 p-6 rounded-lg">
          <h3 className="text-xs tracking-widest uppercase text-[#888888] mb-2">Active Orders</h3>
          <p className="text-3xl font-serif text-white">42</p>
        </div>
        <div className="bg-[#121212] border border-white/5 p-6 rounded-lg flex items-center justify-between">
          <div>
            <h3 className="text-xs tracking-widest uppercase text-[#888888] mb-2">Baher Brain</h3>
            <p className="text-sm text-white">All systems nominal. No alerts.</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
            <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_#22c55e]"></span>
          </div>
        </div>
      </div>
    </div>
  );
}
