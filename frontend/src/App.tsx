import { Route, Routes } from "react-router-dom";
import { NavBar } from "./components/NavBar";
import Dashboard from "./pages/Dashboard";
import StrategySettings from "./pages/StrategySettings";
import TradeHistory from "./pages/TradeHistory";

export default function App(): JSX.Element {
  return (
    <div className="min-h-screen bg-slate-950">
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/trades" element={<TradeHistory />} />
          <Route path="/settings" element={<StrategySettings />} />
        </Routes>
      </main>
    </div>
  );
}
