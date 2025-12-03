"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import clsx from "clsx";
import { startOfMonth, endOfMonth, subMonths, subDays } from "date-fns";
import { formatISO } from "@/lib/dates";
import { WinLossPatterns } from "./analytics/win-loss-patterns";
import { EquityCurve } from "./analytics/equity-curve";
import { PerformanceInsights } from "./analytics/performance-insights";
import { SummaryCards } from "./analytics/summary-cards";
import { MetricsGrid } from "./analytics/metrics-grid";
import { WeekdayChart } from "./analytics/weekday-chart";

type DatePreset = "today" | "last7days" | "last30days" | "thisMonth" | "lastMonth";

const PRESETS: Array<{ key: DatePreset; label: string }> = [
  { key: "today", label: "Today" },
  { key: "last7days", label: "Last 7 days" },
  { key: "last30days", label: "Last 30 days" },
  { key: "thisMonth", label: "This month" },
  { key: "lastMonth", label: "Last month" },
];

export function AnalyticsDashboard() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({
    from: new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().split("T")[0],
    to: new Date().toISOString().split("T")[0],
  });
  const [activePreset, setActivePreset] = useState<DatePreset | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const getPresetDates = (preset: DatePreset): { from: string; to: string } => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (preset) {
      case "today": {
        const todayStr = formatISO(today);
        return { from: todayStr, to: todayStr };
      }
      case "last7days": {
        const from = subDays(today, 6);
        return {
          from: formatISO(from),
          to: formatISO(today),
        };
      }
      case "last30days": {
        const from = subDays(today, 29);
        return {
          from: formatISO(from),
          to: formatISO(today),
        };
      }
      case "thisMonth": {
        const start = startOfMonth(today);
        const end = endOfMonth(today);
        return {
          from: formatISO(start),
          to: formatISO(end),
        };
      }
      case "lastMonth": {
        const lastMonth = subMonths(today, 1);
        const start = startOfMonth(lastMonth);
        const end = endOfMonth(lastMonth);
        return {
          from: formatISO(start),
          to: formatISO(end),
        };
      }
    }
  };

  const handlePresetClick = (preset: DatePreset) => {
    const dates = getPresetDates(preset);
    setDateRange(dates);
    setActivePreset(preset);
    setMenuOpen(false);
  };

  const handleManualDateChange = (field: "from" | "to", value: string) => {
    setDateRange({ ...dateRange, [field]: value });
    setActivePreset(null);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("pnl-theme");
    if (stored === "light" || stored === "dark") {
      setTheme(stored);
    }
  }, []);

  useEffect(() => {
    const handleStorageChange = () => {
      const stored = window.localStorage.getItem("pnl-theme");
      if (stored === "light" || stored === "dark") {
        setTheme(stored);
      }
    };
    window.addEventListener("storage", handleStorageChange);
    const interval = setInterval(handleStorageChange, 100);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const getPresetLabel = (preset: DatePreset | null) => {
    if (!preset) return "Date range";
    return PRESETS.find((p) => p.key === preset)?.label || "Date range";
  };

  const isLight = theme === "light";
  const surfaceClass = isLight
    ? "rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
    : "rounded-lg border border-slate-700/50 bg-slate-900/50 p-6 shadow-sm";

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <header className={surfaceClass}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className={clsx("text-xs uppercase tracking-wider font-medium mb-1", isLight ? "text-slate-500" : "text-slate-400")}>
              Analytics Dashboard
            </p>
            <h1 className={clsx("text-2xl font-semibold", isLight ? "text-slate-900" : "text-white")}>Performance Analytics</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className={clsx(
                "px-4 py-2 font-medium transition border",
                isLight
                  ? "rounded border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  : "rounded border-slate-600/50 bg-slate-800/50 text-slate-200 hover:bg-slate-700/50"
              )}
            >
              ← Calendar
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              {/* Date Range Menu */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className={clsx(
                    "px-4 py-2 font-medium transition border",
                    isLight
                      ? "rounded border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400"
                      : "rounded border-slate-600/50 bg-slate-800/50 text-slate-200 hover:bg-slate-700/50 hover:border-slate-600"
                  )}
                  aria-label="Date range presets"
                >
                  {getPresetLabel(activePreset)} {menuOpen ? "▲" : "▼"}
                </button>
                {menuOpen && (
                  <div
                    className={clsx(
                      "absolute right-0 mt-2 w-48 border p-2 z-50 shadow-lg rounded-lg",
                      isLight
                        ? "border-slate-200 bg-white"
                        : "border-slate-700/50 bg-slate-900/90"
                    )}
                  >
                    {PRESETS.map((preset) => (
                      <button
                        key={preset.key}
                        onClick={() => handlePresetClick(preset.key)}
                        className={clsx(
                          "w-full text-left px-3 py-2 text-sm font-medium transition rounded mb-1 last:mb-0",
                          activePreset === preset.key
                            ? isLight
                              ? "bg-slate-900 text-white"
                              : "bg-slate-200 text-slate-900"
                            : isLight
                            ? "text-slate-700 hover:bg-slate-100"
                            : "text-slate-300 hover:bg-slate-800/50"
                        )}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* Custom Date Range */}
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => handleManualDateChange("from", e.target.value)}
                  className={clsx(
                    "rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2",
                    isLight
                      ? "border-slate-300 bg-white text-slate-700 focus:ring-slate-400"
                      : "border-slate-600/50 bg-slate-800/50 text-slate-100 focus:ring-slate-500"
                  )}
                />
                <span className={clsx("text-sm", isLight ? "text-slate-600" : "text-slate-400")}>to</span>
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => handleManualDateChange("to", e.target.value)}
                  className={clsx(
                    "rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2",
                    isLight
                      ? "border-slate-300 bg-white text-slate-700 focus:ring-slate-400"
                      : "border-slate-600/50 bg-slate-800/50 text-slate-100 focus:ring-slate-500"
                  )}
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Top Row - Key Performance Indicators */}
      <SummaryCards dateRange={dateRange} theme={theme} />

      {/* Middle Row - Detailed Metrics */}
      <MetricsGrid dateRange={dateRange} theme={theme} />

      {/* Visualizations Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekday P&L Chart */}
        <WeekdayChart dateRange={dateRange} theme={theme} />
        
        {/* Performance Insights */}
        <PerformanceInsights dateRange={dateRange} theme={theme} />
      </div>

      {/* Additional Patterns */}
      <WinLossPatterns dateRange={dateRange} theme={theme} />

      {/* Bottom Row - Equity Curve (Full Width) */}
      <EquityCurve dateRange={dateRange} theme={theme} />
    </div>
  );
}

