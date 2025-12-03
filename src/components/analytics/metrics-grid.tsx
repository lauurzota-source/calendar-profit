"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";

interface MetricsGridProps {
  dateRange: { from: string; to: string };
  theme: "dark" | "light";
}

interface SummaryData {
  totalNetPnl: number;
  avgDailyPnl: number;
  winRate: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  riskRewardRatio: number;
  avgWinPnl: number;
  avgLossPnl: number;
  avgWinHoldTime: number;
  avgLossHoldTime: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
}

export function MetricsGrid({ dateRange, theme }: MetricsGridProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SummaryData | null>(null);

  const isLight = theme === "light";
  const cardClass = isLight
    ? "rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
    : "rounded-lg border border-slate-700/50 bg-slate-900/50 p-5 shadow-sm";

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/analytics/summary?from=${dateRange.from}&to=${dateRange.to}`);
        if (!response.ok) throw new Error("Failed to load summary");
        const json = await response.json();
        setData(json);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dateRange]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className={cardClass}>
            <p className={clsx("text-sm", isLight ? "text-slate-500" : "text-slate-400")}>Loading...</p>
          </div>
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={cardClass}>
        <p className={clsx("text-sm", isLight ? "text-rose-600" : "text-rose-400")}>
          {error || "Failed to load metrics"}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Risk/Reward Ratio */}
      <div className={cardClass}>
        <p className={clsx("text-xs uppercase tracking-wider font-medium mb-3", isLight ? "text-slate-500" : "text-slate-400")}>
          Risk/Reward Ratio
        </p>
        <p className={clsx("text-3xl font-bold", isLight ? "text-slate-900" : "text-white")}>
          1:{data.riskRewardRatio.toFixed(2)}
        </p>
      </div>

      {/* Win Rate */}
      <div className={cardClass}>
        <p className={clsx("text-xs uppercase tracking-wider font-medium mb-3", isLight ? "text-slate-500" : "text-slate-400")}>
          Win Rate
        </p>
        <p className={clsx("text-3xl font-bold", isLight ? "text-slate-900" : "text-white")}>
          {data.winRate.toFixed(1)}%
        </p>
        <p className={clsx("text-xs mt-1", isLight ? "text-slate-500" : "text-slate-400")}>
          {data.winningTrades}W / {data.losingTrades}L
        </p>
      </div>

      {/* Max Drawdown */}
      <div className={cardClass}>
        <p className={clsx("text-xs uppercase tracking-wider font-medium mb-3", isLight ? "text-slate-500" : "text-slate-400")}>
          Max Drawdown
        </p>
        <div className="space-y-2">
          <div>
            <p className={clsx("text-2xl font-bold", isLight ? "text-rose-600" : "text-rose-400")}>
              {data.maxDrawdownPercent.toFixed(1)}%
            </p>
            <p className={clsx("text-xs", isLight ? "text-slate-500" : "text-slate-400")}>
              ${data.maxDrawdown.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* % Return */}
      <div className={cardClass}>
        <p className={clsx("text-xs uppercase tracking-wider font-medium mb-3", isLight ? "text-slate-500" : "text-slate-400")}>
          % Return
        </p>
        <p className={clsx("text-3xl font-bold", data.totalNetPnl >= 0 ? (isLight ? "text-emerald-600" : "text-emerald-400") : (isLight ? "text-rose-600" : "text-rose-400"))}>
          {data.totalNetPnl >= 0 ? "+" : ""}
          {((data.totalNetPnl / (data.totalNetPnl + data.maxDrawdown + 1000)) * 100).toFixed(1)}%
        </p>
      </div>

      {/* Avg Winning Trade Holding Time */}
      <div className={cardClass}>
        <p className={clsx("text-xs uppercase tracking-wider font-medium mb-3", isLight ? "text-slate-500" : "text-slate-400")}>
          Avg Winning Trade Hold Time
        </p>
        <p className={clsx("text-3xl font-bold", isLight ? "text-emerald-600" : "text-emerald-400")}>
          {data.avgWinHoldTime.toFixed(1)} Hrs
        </p>
      </div>

      {/* Avg Losing Trade Holding Time */}
      <div className={cardClass}>
        <p className={clsx("text-xs uppercase tracking-wider font-medium mb-3", isLight ? "text-slate-500" : "text-slate-400")}>
          Avg Losing Trade Hold Time
        </p>
        <p className={clsx("text-3xl font-bold", isLight ? "text-rose-600" : "text-rose-400")}>
          {data.avgLossHoldTime.toFixed(1)} Hrs
        </p>
      </div>

      {/* Avg Winning Trade Net P&L */}
      <div className={clsx("rounded-lg border p-5 shadow-sm", isLight ? "border-emerald-200 bg-emerald-50" : "border-emerald-500/30 bg-emerald-500/10")}>
        <p className={clsx("text-xs uppercase tracking-wider font-medium mb-3", isLight ? "text-emerald-700" : "text-emerald-300")}>
          Avg Winning Trade Net P&L
        </p>
        <p className={clsx("text-3xl font-bold", isLight ? "text-emerald-700" : "text-emerald-300")}>
          ${data.avgWinPnl.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>

      {/* Avg Losing Trade Net P&L */}
      <div className={clsx("rounded-lg border p-5 shadow-sm", isLight ? "border-rose-200 bg-rose-50" : "border-rose-500/30 bg-rose-500/10")}>
        <p className={clsx("text-xs uppercase tracking-wider font-medium mb-3", isLight ? "text-rose-700" : "text-rose-300")}>
          Avg Losing Trade Net P&L
        </p>
        <p className={clsx("text-3xl font-bold", isLight ? "text-rose-700" : "text-rose-300")}>
          -${data.avgLossPnl.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>
    </div>
  );
}

