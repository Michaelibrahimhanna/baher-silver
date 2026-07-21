export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6">
        {/* Luxury Brand Preloader - A minimal rotating diamond or square */}
        <div className="w-8 h-8 border-[1.5px] border-primary rotate-45 animate-[spin_3s_cubic-bezier(0.25,0.1,0.25,1)_infinite]"></div>
        <p className="font-serif tracking-widest text-primary text-sm uppercase opacity-50">Baher Silver</p>
      </div>
    </div>
  );
}
