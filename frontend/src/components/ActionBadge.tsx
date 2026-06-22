import { TradeAction } from "../types";

const ACTION_CLASSES: Record<TradeAction, string> = {
  BUY: "bg-emerald-900/60 text-emerald-300 border-emerald-700",
  SELL: "bg-red-900/60 text-red-300 border-red-700",
  HOLD: "bg-slate-800 text-slate-300 border-slate-700",
};

interface ActionBadgeProps {
  action: TradeAction;
}

export function ActionBadge({ action }: ActionBadgeProps): JSX.Element {
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${ACTION_CLASSES[action]}`}>
      {action}
    </span>
  );
}
