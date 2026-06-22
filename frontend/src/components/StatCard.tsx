interface StatCardProps {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "negative";
  sublabel?: string;
}

const TONE_CLASSES: Record<Required<StatCardProps>["tone"], string> = {
  neutral: "text-slate-100",
  positive: "text-emerald-400",
  negative: "text-red-400",
};

export function StatCard({ label, value, tone = "neutral", sublabel }: StatCardProps): JSX.Element {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${TONE_CLASSES[tone]}`}>{value}</div>
      {sublabel && <div className="mt-1 text-xs text-slate-500">{sublabel}</div>}
    </div>
  );
}
