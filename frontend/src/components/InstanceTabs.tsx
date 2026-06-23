import { useState, type KeyboardEvent } from "react";
import { useInstances } from "../context/InstanceContext";

const PRESET_COLORS = [
  "#10b981", "#3b82f6", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316",
  "#6366f1", "#84cc16",
];

export function InstanceTabs(): JSX.Element {
  const { currentInstance, instances, switchInstance, createInstance, deleteInstance, updateInstance } = useInstances();
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#10b981");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  async function handleCreate(): Promise<void> {
    if (!newName.trim()) return;
    await createInstance(newName.trim(), newColor);
    setNewName("");
    setNewColor("#10b981");
    setShowNewForm(false);
  }

  async function handleDelete(id: string, name: string): Promise<void> {
    if (instances.length <= 1) return;
    if (!window.confirm(`Delete bot "${name}"? This cannot be undone.`)) return;
    await deleteInstance(id);
  }

  function startEdit(instance: { id: string; name: string }): void {
    setEditingId(instance.id);
    setEditName(instance.name);
  }

  async function finishEdit(id: string): Promise<void> {
    if (editName.trim() && editName.trim() !== instances.find((i) => i.id === id)?.name) {
      await updateInstance(id, { name: editName.trim() });
    }
    setEditingId(null);
    setEditName("");
  }

  function handleEditKeyDown(e: KeyboardEvent<HTMLInputElement>, id: string): void {
    if (e.key === "Enter") {
      finishEdit(id);
    } else if (e.key === "Escape") {
      setEditingId(null);
      setEditName("");
    }
  }

  if (instances.length === 0) return <></>;

  return (
    <div className="flex items-center gap-1 border-b border-slate-800 bg-slate-950 px-4 pb-0">
      {instances.map((instance) => (
        <div key={instance.id} className="group relative">
          <button
            onClick={() => switchInstance(instance.id)}
            onDoubleClick={() => startEdit(instance)}
            className={`flex items-center gap-1.5 rounded-t-md px-3 py-1.5 text-xs font-medium transition-colors ${
              currentInstance?.id === instance.id
                ? "bg-slate-900 text-slate-100"
                : "text-slate-500 hover:bg-slate-900/50 hover:text-slate-300"
            }`}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: instance.color }}
              onClick={(e) => {
                e.stopPropagation();
                const colors = PRESET_COLORS;
                const idx = colors.indexOf(instance.color);
                const nextColor = colors[(idx + 1) % colors.length];
                updateInstance(instance.id, { color: nextColor });
              }}
              title="Click to cycle color"
            />
            {editingId === instance.id ? (
              <input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={() => finishEdit(instance.id)}
                onKeyDown={(e) => handleEditKeyDown(e, instance.id)}
                className="w-24 rounded border border-slate-600 bg-slate-800 px-1 py-0 text-xs text-slate-100 outline-none"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="max-w-24 truncate">{instance.name}</span>
            )}
          </button>
          {instances.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(instance.id, instance.name);
              }}
              className="absolute -right-1 -top-1 hidden h-3.5 w-3.5 items-center justify-center rounded-full bg-slate-700 text-[10px] leading-none text-slate-400 hover:bg-red-600 hover:text-white group-hover:flex"
              title={`Delete ${instance.name}`}
            >
              ×
            </button>
          )}
        </div>
      ))}

      {showNewForm ? (
        <div className="flex items-center gap-1 rounded-t-md bg-slate-900 px-3 py-1.5">
          <div className="relative">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: newColor }}
            />
            <select
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="absolute inset-0 cursor-pointer opacity-0"
            >
              {PRESET_COLORS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") setShowNewForm(false);
            }}
            onBlur={() => {
              if (!newName.trim()) setShowNewForm(false);
            }}
            placeholder="Bot name..."
            className="w-24 rounded border border-slate-600 bg-slate-800 px-1 py-0 text-xs text-slate-100 outline-none"
          />
        </div>
      ) : (
        <button
          onClick={() => setShowNewForm(true)}
          className="rounded-t-md px-2 py-1.5 text-xs text-slate-500 transition-colors hover:bg-slate-900/50 hover:text-slate-300"
          title="New bot"
        >
          +
        </button>
      )}
    </div>
  );
}
