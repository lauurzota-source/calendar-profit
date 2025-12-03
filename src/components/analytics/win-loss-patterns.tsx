"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";

interface WinLossData {
  category: string | number;
  wins: number;
  losses: number;
  breakeven: number;
  totalPnl: number;
  winRate: number;
  totalTrades: number;
}

interface WinLossPatternsProps {
  dateRange: { from: string; to: string };
  theme: "dark" | "light";
}

export function WinLossPatterns({ dateRange, theme }: WinLossPatternsProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    weekday: WinLossData[];
    hour: WinLossData[];
    pair: WinLossData[];
    direction: WinLossData[];
  } | null>(null);
  const [activeTab, setActiveTab] = useState<"weekday" | "hour" | "pair" | "direction">("weekday");

  const isLight = theme === "light";
  const surfaceClass = isLight
    ? "rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
    : "rounded-lg border border-slate-700/50 bg-slate-900/50 p-6 shadow-sm";

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/analytics/win-loss-patterns?from=${dateRange.from}&to=${dateRange.to}`
        );
        if (!response.ok) throw new Error("Failed to load win/loss patterns");
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

  const currentData = data ? data[activeTab] : [];

  const maxWinRate = currentData.length > 0
    ? Math.max(...currentData.map((d) => d.winRate))
    : 0;

  return (
    <div className={surfaceClass}>
      <h2 className={clsx("text-lg font-semibold mb-4", isLight ? "text-slate-900" : "text-white")}>
        Win/Loss Patterns
      </h2>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b" style={isLight ? { borderColor: "#e2e8f0" } : { borderColor: "#475569" }}>
        {(["weekday", "hour", "pair", "direction"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={clsx(
              "px-4 py-2 text-sm font-medium transition border-b-2 -mb-px",
              activeTab === tab
                ? isLight
                  ? "border-slate-900 text-slate-900"
                  : "border-slate-200 text-white"
                : isLight
                ? "border-transparent text-slate-500 hover:text-slate-700"
                : "border-transparent text-slate-400 hover:text-slate-200"
            )}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {loading && (
        <p className={clsx("text-sm", isLight ? "text-slate-500" : "text-slate-400")}>Loading patterns...</p>
      )}

      {error && (
        <p className={clsx("text-sm", isLight ? "text-rose-600" : "text-rose-400")}>{error}</p>
      )}

      {!loading && !error && currentData && (
        <div className="space-y-3">
          {currentData.map((item) => {
            const winRatePercent = item.winRate;
            const barWidth = maxWinRate > 0 ? (winRatePercent / maxWinRate) * 100 : 0;
            const isPositive = item.totalPnl > 0;

            return (
              <div key={item.category} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className={clsx("font-medium", isLight ? "text-slate-700" : "text-slate-200")}>
                    {item.category}
                  </span>
                  <div className="flex items-center gap-4">
                    <span className={clsx("text-xs", isLight ? "text-slate-500" : "text-slate-400")}>
                      {item.wins}W / {item.losses}L / {item.breakeven}BE
                    </span>
                    <span
                      className={clsx(
                        "text-sm font-semibold",
                        isPositive
                          ? isLight
                            ? "text-emerald-600"
                            : "text-emerald-400"
                          : isLight
                          ? "text-rose-600"
                          : "text-rose-400"
                      )}
                    >
                      ${item.totalPnl.toFixed(2)}
                    </span>
                    <span
                      className={clsx(
                        "text-sm font-semibold w-16 text-right",
                        winRatePercent >= 50
                          ? isLight
                            ? "text-emerald-600"
                            : "text-emerald-400"
                          : isLight
                          ? "text-rose-600"
                          : "text-rose-400"
                      )}
                    >
                      {winRatePercent.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div
                  className={clsx(
                    "h-2 rounded-full overflow-hidden",
                    isLight ? "bg-slate-100" : "bg-slate-800"
                  )}
                >
                  <div
                    className={clsx(
                      "h-full transition-all",
                      winRatePercent >= 50
                        ? "bg-emerald-500"
                        : "bg-rose-500"
                    )}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

