"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";

interface WeekdayData {
  category: string;
  wins: number;
  losses: number;
  breakeven: number;
  totalPnl: number;
  winRate: number;
  totalTrades: number;
}

interface WeekdayChartProps {
  dateRange: { from: string; to: string };
  theme: "dark" | "light";
}

export function WeekdayChart({ dateRange, theme }: WeekdayChartProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<WeekdayData[]>([]);

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
        if (!response.ok) throw new Error("Failed to load weekday data");
        const json = await response.json();
        setData(json.weekday || []);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dateRange]);

  const weekdayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const orderedData = weekdayOrder.map((day) => data.find((d) => d.category === day)).filter(Boolean) as WeekdayData[];

  const maxPnl = Math.max(...orderedData.map((d) => Math.abs(d.totalPnl)), 1);
  const minPnl = Math.min(...orderedData.map((d) => d.totalPnl), 0);

  if (loading) {
    return (
      <div className={surfaceClass}>
        <h2 className={clsx("text-lg font-semibold mb-4", isLight ? "text-slate-900" : "text-white")}>
          Avg Daily Net P&L Per Weekday
        </h2>
        <p className={clsx("text-sm", isLight ? "text-slate-500" : "text-slate-400")}>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={surfaceClass}>
        <h2 className={clsx("text-lg font-semibold mb-4", isLight ? "text-slate-900" : "text-white")}>
          Avg Daily Net P&L Per Weekday
        </h2>
        <p className={clsx("text-sm", isLight ? "text-rose-600" : "text-rose-400")}>{error}</p>
      </div>
    );
  }

  return (
    <div className={surfaceClass}>
      <h2 className={clsx("text-lg font-semibold mb-6", isLight ? "text-slate-900" : "text-white")}>
        Avg Daily Net P&L Per Weekday
      </h2>

      {orderedData.length === 0 ? (
        <p className={clsx("text-sm text-center py-8", isLight ? "text-slate-500" : "text-slate-400")}>
          No data available for the selected date range.
        </p>
      ) : (
        <div className="space-y-4">
          {orderedData.map((item) => {
            const isPositive = item.totalPnl > 0;
            const barWidth = maxPnl > 0 ? (Math.abs(item.totalPnl) / maxPnl) * 100 : 0;
            const dayLabel = item.category.substring(0, 3).toUpperCase();

            return (
              <div key={item.category} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={clsx("text-sm font-medium w-12", isLight ? "text-slate-700" : "text-slate-200")}>
                    {dayLabel}
                  </span>
                  <div className="flex-1 mx-4">
                    <div className="relative h-8">
                      <div
                        className={clsx(
                          "h-full rounded transition-all flex items-center justify-end pr-2",
                          isPositive
                            ? isLight
                              ? "bg-emerald-500"
                              : "bg-emerald-500/80"
                            : isLight
                            ? "bg-rose-500"
                            : "bg-rose-500/80"
                        )}
                        style={{ width: `${barWidth}%`, marginLeft: isPositive ? "0" : "auto" }}
                      >
                        <span
                          className={clsx(
                            "text-xs font-semibold",
                            isLight ? "text-white" : "text-white"
                          )}
                        >
                          {item.totalPnl !== 0 && `$${Math.abs(item.totalPnl).toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span
                    className={clsx(
                      "text-sm font-semibold w-24 text-right",
                      isPositive
                        ? isLight
                          ? "text-emerald-600"
                          : "text-emerald-400"
                        : isLight
                        ? "text-rose-600"
                        : "text-rose-400"
                    )}
                  >
                    {isPositive ? "+" : ""}
                    ${item.totalPnl.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

