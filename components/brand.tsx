export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <div className="relative grid size-9 place-items-center rounded-2xl accent-gradient shadow-glow">
        <div className="absolute inset-[1px] rounded-[15px] bg-gradient-to-b from-white/30 to-transparent" />
        <div className="relative size-3.5 rounded-full border border-white/70 bg-white/25 backdrop-blur-sm">
          <div className="absolute inset-1 rounded-full bg-white/90" />
        </div>
      </div>
      {!compact && (
        <div className="leading-none">
          <div className="text-[15px] font-semibold tracking-tight text-fg">
            Zaman<span className="text-accent">.</span>
          </div>
          <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-faint">
            Türkiye saati
          </div>
        </div>
      )}
    </div>
  );
}
