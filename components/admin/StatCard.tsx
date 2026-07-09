type StatCardProps = {
  label: string;
  value: string | number;
};

export function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="bg-white border border-card-border rounded-card px-4 py-4 sm:px-6 sm:py-5">
      <div className="text-[32px] sm:text-[42px] font-serif-display leading-none text-[#1a1a1a] truncate">
        {value}
      </div>
      <div className="mt-2 sm:mt-3 text-[10px] tracking-[0.16em] uppercase text-text-muted">
        {label}
      </div>
    </div>
  );
}
