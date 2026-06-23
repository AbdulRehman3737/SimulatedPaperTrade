import { useEffect, useState, type FormEvent } from "react";
import { useSWRConfig } from "swr";
import { useInstances } from "../context/InstanceContext";
import { extractErrorMessage, resetPortfolio, updateSettings } from "../api/client";
import { useSettings } from "../hooks/useInstanceData";
import { ErrorMessage } from "../components/ErrorMessage";
import { Spinner } from "../components/Spinner";
import { Settings } from "../types";

const FIELDS: { key: keyof Settings; label: string; suffix?: string }[] = [
  { key: "startingMoney", label: "Starting Money", suffix: "$" },
  { key: "investmentPerTrade", label: "Investment per Trade", suffix: "$" },
  { key: "takeProfit", label: "Take Profit", suffix: "%" },
  { key: "stopLoss", label: "Stop Loss", suffix: "%" },
  { key: "rsiBuy", label: "RSI Buy Threshold" },
  { key: "rsiSell", label: "RSI Sell Threshold" },
  { key: "minVolumeChange", label: "Min Volume Change", suffix: "%" },
];

export default function StrategySettings(): JSX.Element {
  const { currentInstance } = useInstances();
  const instanceId = currentInstance?.id;
  const { mutate } = useSWRConfig();

  const { data: settings, error, isLoading } = useSettings(instanceId);

  const [form, setForm] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  useEffect(() => {
    if (settings && !form) setForm(settings);
  }, [settings, form]);

  useEffect(() => {
    setForm(null);
  }, [instanceId]);

  if (!instanceId) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        No bot instances available.
      </div>
    );
  }

  if (error) return <ErrorMessage message={error} />;
  if (isLoading || !form) return <Spinner />;

  function handleChange(key: keyof Settings, value: string): void {
    setForm((prev) => (prev ? { ...prev, [key]: Number(value) } : prev));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!form || !instanceId) return;

    setSaving(true);
    setStatusMessage(null);
    setStatusError(null);
    try {
      const saved = await updateSettings(instanceId, form);
      setForm(saved);
      setStatusMessage("Settings saved.");
      await mutate(["settings", instanceId]);
    } catch (err) {
      setStatusError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleReset(): Promise<void> {
    if (!instanceId) return;
    if (!window.confirm("Reset the simulated wallet to the starting money and clear all open positions?")) return;

    setResetting(true);
    setStatusMessage(null);
    setStatusError(null);
    try {
      await resetPortfolio(instanceId);
      setStatusMessage("Portfolio reset.");
      await mutate(["portfolio", instanceId]);
    } catch (err) {
      setStatusError(extractErrorMessage(err));
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="max-w-xl rounded-lg border border-slate-800 bg-slate-900 p-6">
      <h2 className="mb-4 text-sm font-semibold text-slate-200">Strategy Settings</h2>

      {statusMessage && <p className="mb-4 text-sm text-emerald-400">{statusMessage}</p>}
      {statusError && (
        <div className="mb-4">
          <ErrorMessage message={statusError} />
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {FIELDS.map(({ key, label, suffix }) => (
          <div key={key}>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">{label}</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={form[key]}
                onChange={(event) => handleChange(key, event.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                step="any"
              />
              {suffix && <span className="text-sm text-slate-500">{suffix}</span>}
            </div>
          </div>
        ))}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={resetting}
            className="rounded-md border border-red-800 px-4 py-2 text-sm font-semibold text-red-300 transition-colors hover:bg-red-950/50 disabled:opacity-50"
          >
            {resetting ? "Resetting..." : "Reset Portfolio"}
          </button>
        </div>
      </form>
    </div>
  );
}
