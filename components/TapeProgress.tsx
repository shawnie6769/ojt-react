"use client";

interface Props {
  pct: number; // 0-100
}

export default function TapeProgress({ pct }: Props) {
  return (
    <div className="mt-5 space-y-2">
      <div className="relative h-5 rounded-full overflow-hidden tape-track border border-border">
        <div
          className="absolute inset-y-0 left-0 tape-fill rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-xs font-mono text-muted">
        <span>0 hrs</span>
        <span className="text-accent font-semibold">{pct.toFixed(1)}%</span>
        <span>target</span>
      </div>
    </div>
  );
}
