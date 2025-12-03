"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";

interface SummaryCardsProps {
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

export function SummaryCards({ dateRange, theme }: SummaryCardsProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SummaryData | null>(null);

  const isLight = theme === "light";
  const cardClass = isLight
    ? "rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
    : "rounded-lg border border-slate-700/50 bg-slate-900/50 p-6 shadow-sm";

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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
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
          {error || "Failed to load summary data"}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Total Net P/L */}
      <div className={cardClass}>
        <p className={clsx("text-xs uppercase tracking-wider font-medium mb-2", isLight ? "text-slate-500" : "text-slate-400")}>
          Total Net P/L
        </p>
        <p
          className={clsx(
            "text-4xl font-bold",
            data.totalNetPnl >= 0 ? (isLight ? "text-emerald-600" : "text-emerald-400") : (isLight ? "text-rose-600" : "text-rose-400")
          )}
        >
          ${data.totalNetPnl.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>

      {/* Avg Daily Net P&L */}
      <div className={cardClass}>
        <p className={clsx("text-xs uppercase tracking-wider font-medium mb-2", isLight ? "text-slate-500" : "text-slate-400")}>
          Avg Daily Net P&L
        </p>
        <p
          className={clsx(
            "text-4xl font-bold",
            data.avgDailyPnl >= 0 ? (isLight ? "text-emerald-600" : "text-emerald-400") : (isLight ? "text-rose-600" : "text-rose-400")
          )}
        >
          ${data.avgDailyPnl.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>
    </div>
  );
}

