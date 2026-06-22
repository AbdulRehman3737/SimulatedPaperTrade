import { BotStatus } from "../types";

interface BotControlProps {
  status: BotStatus | null;
  onStart: () => void;
  onStop: () => void;
  busy: boolean;
}

export function BotControl({ status, onStart, onStop, busy }: BotControlProps): JSX.Element {
  const running = status?.running ?? false;

  const subtext = running && status?.nextRunAt
    ? `Next run: ${new Date(status.nextRunAt).toLocaleTimeString()}`
    : status?.lastRunAt
      ? `Last run: ${new Date(status.lastRunAt).toLocaleTimeString()}`
      : "Not started yet";

  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900 p-4">
      <span className={`h-2.5 w-2.5 rounded-full ${running ? "bg-emerald-400" : "bg-slate-600"}`} />
      <div className="flex-1">
        <div className="text-sm font-medium text-slate-100">Bot is {running ? "running" : "stopped"}</div>
        <div className="text-xs text-slate-500">{subtext}</div>
      </div>
      <button
        onClick={running ? onStop : onStart}
        disabled={busy}
        className={`rounded-md px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50 ${
          running ? "bg-red-700 hover:bg-red-600" : "bg-emerald-600 hover:bg-emerald-500"
        }`}
      >
        {running ? "Stop Bot" : "Start Bot"}
      </button>
    </div>
  );
}
