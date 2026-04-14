"use client";

import clsx from "clsx";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DateMode, MonthlyPnl } from "@/lib/types";

const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function YearlyPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [dateMode, setDateMode] = useState<DateMode>("open");
  const [monthlyData, setMonthlyData] = useState<MonthlyPnl[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  const fetchMonthly = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/monthly-pnl?year=${year}&dateMode=${dateMode}`, { signal });
      if (!res.ok) throw new Error("Failed to load monthly totals");
      const json = await res.json();
      setMonthlyData(json.data as MonthlyPnl[]);
    } catch (err) {
      if ((err as DOMException).name !== "AbortError") {
        setError((err as Error).message);
      }
    } finally {
      setLoading(false);
    }
  }, [year, dateMode]);

  useEffect(() => {
    const controller = new AbortController();
    fetchMonthly(controller.signal);
    return () => controller.abort();
  }, [fetchMonthly]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedTheme = window.localStorage.getItem("pnl-theme");
    if (storedTheme === "light" || storedTheme === "dark") {
      setTheme(storedTheme);
    }
    const storedDateMode = window.localStorage.getItem("pnl-date-mode");
    if (storedDateMode === "open" || storedDateMode === "close") {
      setDateMode(storedDateMode);
    }
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const html = document.documentElement;
    html.classList.remove("theme-dark", "theme-light");
    html.classList.add(theme === "light" ? "theme-light" : "theme-dark");
    if (typeof window !== "undefined") {
      window.localStorage.setItem("pnl-theme", theme);
    }
  }, [theme]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("pnl-date-mode", dateMode);
    }
  }, [dateMode]);

  const isLight = theme === "light";

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 15 }, (_, index) => current - 10 + index);
  }, []);

  const monthMap = useMemo(() => {
    return new Map(monthlyData.map((entry) => [entry.month, entry]));
  }, [monthlyData]);

  const fullMonths = useMemo(() => {
    return monthLabels.map((label, index) => {
      const key = `${year}-${String(index + 1).padStart(2, "0")}`;
      const entry = monthMap.get(key);
      return {
        label,
        month: key,
        monthlyPnl: entry?.monthlyPnl ?? 0,
        itemCount: entry?.itemCount ?? 0,
      };
    });
  }, [monthMap, year]);

  const yearTotal = useMemo(() => {
    return fullMonths.reduce((sum, month) => sum + month.monthlyPnl, 0);
  }, [fullMonths]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:py-16">
      <div className="space-y-6">
        <header className={clsx("rounded-lg border p-6 shadow-sm", isLight ? "border-slate-200 bg-white" : "border-slate-700/50 bg-slate-900/50")}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className={clsx("text-xs uppercase tracking-wider font-medium mb-1", isLight ? "text-slate-500" : "text-slate-400")}>Yearly Profit Calendar</p>
              <h1 className={clsx("text-2xl font-semibold", isLight ? "text-slate-900" : "text-white")}>{year} Monthly Totals</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/"
                className={clsx(
                  "rounded border px-4 py-2 text-sm font-medium transition",
                  isLight ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-50" : "border-slate-600/50 bg-slate-800/50 text-slate-200 hover:bg-slate-700/50"
                )}
              >
                Monthly view
              </Link>
              <button
                onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
                className={clsx(
                  "rounded border px-4 py-2 text-sm font-medium transition",
                  isLight ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-50" : "border-slate-600/50 bg-slate-800/50 text-slate-200 hover:bg-slate-700/50"
                )}
              >
                {isLight ? "Dark mode" : "Light mode"}
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <select
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
              className={clsx(
                "rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 transition",
                isLight ? "border-slate-300 bg-white text-slate-700 focus:ring-slate-400" : "border-slate-600/80 bg-slate-900/70 text-slate-100 focus:border-cyan-400"
              )}
            >
              {yearOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-4">
              <label className={clsx("text-sm", isLight ? "text-slate-700" : "text-slate-200")}>
                <input
                  className="mr-2"
                  type="radio"
                  name="yearly-date-mode"
                  value="open"
                  checked={dateMode === "open"}
                  onChange={() => setDateMode("open")}
                />
                Open date
              </label>
              <label className={clsx("text-sm", isLight ? "text-slate-700" : "text-slate-200")}>
                <input
                  className="mr-2"
                  type="radio"
                  name="yearly-date-mode"
                  value="close"
                  checked={dateMode === "close"}
                  onChange={() => setDateMode("close")}
                />
                Close date
              </label>
            </div>
            <div className={clsx("ml-auto rounded-lg border px-4 py-2", isLight ? "border-slate-200 bg-slate-50" : "border-slate-700/50 bg-slate-800/50")}>
              <p className={clsx("text-xs uppercase tracking-wider font-medium", isLight ? "text-slate-500" : "text-slate-400")}>Year total</p>
              <p className={clsx("font-mono text-xl font-semibold", yearTotal >= 0 ? (isLight ? "text-emerald-600" : "text-emerald-400") : (isLight ? "text-rose-600" : "text-rose-400"))}>
                {formatCurrency(yearTotal)}
              </p>
            </div>
          </div>
          {error && <p className={clsx("mt-3 text-sm", isLight ? "text-rose-600" : "text-rose-400")}>{error}</p>}
        </header>

        <section className={clsx("rounded-lg border p-6 shadow-sm", isLight ? "border-slate-200 bg-white" : "border-slate-700/50 bg-slate-900/50")}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {fullMonths.map((month) => (
              <article
                key={month.month}
                className={clsx(
                  "rounded-lg border p-4",
                  month.monthlyPnl > 0
                    ? isLight
                      ? "border-emerald-300/50 bg-emerald-50/80"
                      : "border-emerald-500/30 bg-emerald-500/10"
                    : month.monthlyPnl < 0
                    ? isLight
                      ? "border-rose-300/50 bg-rose-50/80"
                      : "border-rose-500/30 bg-rose-500/10"
                    : isLight
                    ? "border-slate-200 bg-slate-50"
                    : "border-slate-700/50 bg-slate-800/30"
                )}
              >
                <p className={clsx("text-xs uppercase tracking-wider font-medium", isLight ? "text-slate-500" : "text-slate-400")}>{month.label}</p>
                <p className={clsx("mt-2 text-2xl font-semibold", month.monthlyPnl >= 0 ? (isLight ? "text-emerald-600" : "text-emerald-300") : (isLight ? "text-rose-600" : "text-rose-300"))}>
                  {formatCurrency(month.monthlyPnl)}
                </p>
                <p className={clsx("mt-1 text-xs", isLight ? "text-slate-500" : "text-slate-400")}>{month.itemCount} trades</p>
              </article>
            ))}
          </div>
          {loading && <p className={clsx("mt-4 text-sm", isLight ? "text-slate-500" : "text-slate-400")}>Loading monthly totals…</p>}
        </section>
      </div>
    </main>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(value);
}
