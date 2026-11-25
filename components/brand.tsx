export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex select-none items-center gap-3">
      <div className="clay-button grid size-11 place-items-center rounded-[16px]" aria-hidden="true">
        <span className="text-[22px] leading-none">⏱️</span>
      </div>
      {!compact && (
        <div className="leading-none">
          <div className="font-display text-[22px] font-semibold tracking-tight text-fg">Zaman</div>
          <div className="mt-1 text-[12px] font-semibold text-faint">odak &amp; görevler</div>
        </div>
      )}
    </div>
  );
}
