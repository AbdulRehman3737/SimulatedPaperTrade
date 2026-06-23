import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { createInstance as apiCreateInstance, deleteInstance as apiDeleteInstance, listInstances, updateInstance as apiUpdateInstance } from "../api/client";
import { BotInstance } from "../types";

interface InstanceContextValue {
  currentInstance: BotInstance | null;
  instances: BotInstance[];
  switchInstance: (id: string) => void;
  createInstance: (name: string, color: string) => Promise<void>;
  deleteInstance: (id: string) => Promise<void>;
  updateInstance: (id: string, patch: Partial<Pick<BotInstance, "name" | "color">>) => Promise<void>;
  loading: boolean;
}

const InstanceContext = createContext<InstanceContextValue | null>(null);

const STORAGE_KEY = "selectedInstanceId";

export function InstanceProvider({ children }: { children: ReactNode }): JSX.Element {
  const [instances, setInstances] = useState<BotInstance[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY));
  const [loading, setLoading] = useState(true);

  const fetchInstances = useCallback(async () => {
    try {
      const result = await listInstances();
      setInstances(result);
      if (result.length > 0 && !currentId) {
        setCurrentId(result[0].id);
      }
      if (currentId && !result.find((i) => i.id === currentId)) {
        setCurrentId(result[0]?.id ?? null);
      }
    } catch {
      // silently handle — will retry on next mount
    } finally {
      setLoading(false);
    }
  }, [currentId]);

  useEffect(() => {
    fetchInstances();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (currentId) {
      localStorage.setItem(STORAGE_KEY, currentId);
    }
  }, [currentId]);

  const switchInstance = useCallback((id: string) => {
    setCurrentId(id);
  }, []);

  const createInstance = useCallback(
    async (name: string, color: string) => {
      const instance = await apiCreateInstance(name, color);
      setInstances((prev) => [...prev, instance]);
      setCurrentId(instance.id);
    },
    []
  );

  const deleteInstance = useCallback(
    async (id: string) => {
      await apiDeleteInstance(id);
      setInstances((prev) => prev.filter((i) => i.id !== id));
      if (currentId === id) {
      const remaining = instances.filter((i) => i.id !== id);
      setCurrentId(remaining[0]?.id ?? null);
      }
    },
    [currentId, instances]
  );

  const updateInstance = useCallback(
    async (id: string, patch: Partial<Pick<BotInstance, "name" | "color">>) => {
      const updated = await apiUpdateInstance(id, patch);
      setInstances((prev) => prev.map((i) => (i.id === id ? updated : i)));
    },
    []
  );

  const currentInstance = instances.find((i) => i.id === currentId) ?? instances[0] ?? null;

  return (
    <InstanceContext.Provider
      value={{ currentInstance, instances, switchInstance, createInstance, deleteInstance, updateInstance, loading }}
    >
      {children}
    </InstanceContext.Provider>
  );
}

export function useInstances(): InstanceContextValue {
  const ctx = useContext(InstanceContext);
  if (!ctx) throw new Error("useInstances must be used within InstanceProvider");
  return ctx;
}
