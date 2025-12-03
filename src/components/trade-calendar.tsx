"use client";

import { addMonths, endOfMonth, format, startOfMonth } from "date-fns";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import clsx from "clsx";
import Link from "next/link";
import { AggregationMode, DailyPnl, TradeIdeaSummary, TradeWithNet, DateMode } from "@/lib/types";
import { formatISO, getCalendarDays } from "@/lib/dates";

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function TradeCalendar() {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [dailyMap, setDailyMap] = useState<Record<string, DailyPnl>>({});
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [showTrades, setShowTrades] = useState(false);
  const [showTradeIdeas, setShowTradeIdeas] = useState(false);
  const [dateMode, setDateMode] = useState<DateMode>("open");
  
  // Determine viewMode based on checkboxes
  const viewMode: AggregationMode = useMemo(() => {
    if (!showTrades && !showTradeIdeas) return "trades"; // Return trades mode but won't fetch data
    if (showTradeIdeas) return "ideas";
    if (showTrades) return "trades";
    return "trades"; // default fallback
  }, [showTrades, showTradeIdeas]);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [showWeekends, setShowWeekends] = useState(true);
  const [liveUpdates, setLiveUpdates] = useState(true);
  const [calendarView, setCalendarView] = useState<"gallery" | "inline">("gallery");
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [detailItems, setDetailItems] = useState<(TradeWithNet | TradeIdeaSummary)[]>([]);
  const [detailMode, setDetailMode] = useState<AggregationMode>("trades");
  const [loadingTrades, setLoadingTrades] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  // Fetch daily P&L data
  const fetchDaily = useCallback(async (signal?: AbortSignal) => {
    setLoadingCalendar(true);
    setError(null);
    try {
      const start = formatISO(startOfMonth(cursor));
      const end = formatISO(endOfMonth(cursor));
      // Always fetch data to show P&L, but use appropriate mode
      const modeToUse = (!showTrades && !showTradeIdeas) ? "trades" : viewMode;
      const res = await fetch(`/api/daily-pnl?from=${start}&to=${end}&mode=${modeToUse}&dateMode=${dateMode}`, {
        signal,
      });
      if (!res.ok) throw new Error("Failed to load daily P&L");
      const json = await res.json();
      const map: Record<string, DailyPnl> = {};
      for (const entry of json.data as DailyPnl[]) {
        map[entry.date] = entry;
      }
      setDailyMap(map);
    } catch (err) {
      if ((err as DOMException).name !== "AbortError") {
        setError((err as Error).message);
      }
    } finally {
      setLoadingCalendar(false);
    }
  }, [cursor, viewMode, dateMode, showTrades, showTradeIdeas]);

  useEffect(() => {
    const controller = new AbortController();
    fetchDaily(controller.signal);
    return () => controller.abort();
  }, [cursor, viewMode, dateMode]);

  // Load trades for selected date
  const loadTrades = useCallback(async (signal?: AbortSignal) => {
    if (!selectedDate) {
      setDetailItems([]);
      return;
    }
    
    // Don't fetch if both are disabled
    if (!showTrades && !showTradeIdeas) {
      setDetailItems([]);
      return;
    }
    
    setLoadingTrades(true);
    setError(null);
    try {
      const res = await fetch(`/api/trades-by-day?date=${selectedDate}&mode=${viewMode}&dateMode=${dateMode}`, {
        signal,
      });
      if (!res.ok) throw new Error("Failed to load trades");
      const json = await res.json();
      setDetailMode(json.mode ?? viewMode);
      setDetailItems(json.data as (TradeWithNet | TradeIdeaSummary)[]);
    } catch (err) {
      if ((err as DOMException).name !== "AbortError") {
        setError((err as Error).message);
      }
    } finally {
      setLoadingTrades(false);
    }
  }, [selectedDate, viewMode, dateMode, showTrades, showTradeIdeas]);

  useEffect(() => {
    const controller = new AbortController();
    loadTrades(controller.signal);
    return () => controller.abort();
  }, [selectedDate, viewMode, dateMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedTheme = window.localStorage.getItem("pnl-theme");
    if (storedTheme === "light" || storedTheme === "dark") {
      setTheme(storedTheme);
    }
    const storedWeekends = window.localStorage.getItem("pnl-show-weekends");
    if (storedWeekends === "true" || storedWeekends === "false") {
      setShowWeekends(storedWeekends === "true");
    }
    const storedDateMode = window.localStorage.getItem("pnl-date-mode");
    if (storedDateMode === "open" || storedDateMode === "close") {
      setDateMode(storedDateMode);
    }
    const storedLiveUpdates = window.localStorage.getItem("pnl-live-updates");
    if (storedLiveUpdates === "true" || storedLiveUpdates === "false") {
      setLiveUpdates(storedLiveUpdates === "true");
    }
    const storedShowTrades = window.localStorage.getItem("pnl-show-trades");
    if (storedShowTrades === "true" || storedShowTrades === "false") {
      setShowTrades(storedShowTrades === "true");
    } else {
      // Default: both false (hide all)
      setShowTrades(false);
    }
    const storedShowTradeIdeas = window.localStorage.getItem("pnl-show-trade-ideas");
    if (storedShowTradeIdeas === "true" || storedShowTradeIdeas === "false") {
      setShowTradeIdeas(storedShowTradeIdeas === "true");
    } else {
      // Default: both false (hide all)
      setShowTradeIdeas(false);
    }
    const storedCalendarView = window.localStorage.getItem("pnl-calendar-view");
    if (storedCalendarView === "gallery" || storedCalendarView === "inline") {
      setCalendarView(storedCalendarView);
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
      window.localStorage.setItem("pnl-show-weekends", String(showWeekends));
    }
  }, [showWeekends]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("pnl-date-mode", dateMode);
    }
  }, [dateMode]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("pnl-live-updates", String(liveUpdates));
    }
  }, [liveUpdates]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("pnl-show-trades", String(showTrades));
    }
  }, [showTrades]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("pnl-show-trade-ideas", String(showTradeIdeas));
    }
  }, [showTradeIdeas]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("pnl-calendar-view", calendarView);
    }
  }, [calendarView]);

  // Live updates polling - refresh every 5 seconds when enabled and tab is visible
  useEffect(() => {
    if (!liveUpdates) return;

    let intervalId: NodeJS.Timeout | null = null;

    const refresh = () => {
      if (document.visibilityState === "visible") {
        fetchDaily();
        if (selectedDate) {
          loadTrades();
        }
      }
    };

    // Initial refresh
    refresh();

    // Set up interval
    intervalId = setInterval(refresh, 5000); // Refresh every 5 seconds

    // Handle visibility changes
    const visibilityHandler = () => {
      if (document.visibilityState === "visible") {
        // Tab became visible, refresh immediately
        refresh();
        // Restart polling if it was cleared
        if (!intervalId) {
          intervalId = setInterval(refresh, 5000);
        }
      } else {
        // Tab is hidden, pause polling
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      }
    };

    document.addEventListener("visibilitychange", visibilityHandler);

    return () => {
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener("visibilitychange", visibilityHandler);
    };
  }, [liveUpdates, fetchDaily, loadTrades, selectedDate]);

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

  const isLight = theme === "light";

  const { days } = useMemo(() => getCalendarDays(year, month), [year, month]);
  const weeks = useMemo(() => {
    const chunked: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      const week = days.slice(i, i + 7);
      if (!showWeekends) {
        const weekdays = week.filter((date) => {
          const dayOfWeek = date.getDay();
          return dayOfWeek !== 0 && dayOfWeek !== 6; // Filter out Sunday (0) and Saturday (6)
        });
        if (weekdays.length > 0) {
          chunked.push(weekdays);
        }
      } else {
        chunked.push(week);
      }
    }
    return chunked;
  }, [days, showWeekends]);
  const today = useMemo(() => {
    const normalized = new Date();
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  }, []);
  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    const base = Array.from({ length: 9 }, (_, index) => current - 4 + index);
    if (!base.includes(year)) {
      base.push(year);
    }
    return base.sort((a, b) => a - b);
  }, [year]);

  const monthTotal = useMemo(() =>
    Object.values(dailyMap).reduce((sum, day) => sum + day.dailyPnl, 0),
  [dailyMap]
  );

  const handleChangeMonth = (direction: 1 | -1) => {
    setCursor((prev) => addMonths(prev, direction));
    setSelectedDate(null);
  };

  const handleSelectDay = (date: Date) => {
    if (date.getMonth() !== month) return;
    if (date > today) return;
    // Only allow selecting if trades or ideas are shown
    if (showTrades || showTradeIdeas) {
      setSelectedDate(formatISO(date));
    }
  };

  const selectedStats = selectedDate ? dailyMap[selectedDate] : null;
  const unitLabel = viewMode === "ideas" ? "ideas" : "trades";
  const showTradeInfo = showTrades || showTradeIdeas;
  const surfaceHeader = isLight 
    ? "rounded-lg border border-slate-200 bg-white p-6 shadow-sm" 
    : "rounded-lg border border-slate-700/50 bg-slate-900/50 p-6 shadow-sm";
  const calendarSurface = isLight 
    ? "rounded-lg border border-slate-200 bg-white p-6 shadow-sm" 
    : "rounded-lg border border-slate-700/50 bg-slate-900/50 p-6 shadow-sm";
  const manageSurface = isLight 
    ? "rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm" 
    : "rounded-lg border border-slate-700/50 bg-slate-800/30 p-4 text-sm";

  const toggleTheme = () => setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  return (
    <div className="flex flex-col gap-6 px-2 md:px-0">
      <header className={surfaceHeader}>
        <div className="flex flex-col md:flex-row md:flex-wrap md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div>
              <p className={clsx("text-xs uppercase tracking-wider font-medium mb-1", isLight ? "text-slate-500" : "text-slate-400")}>P&L Calendar</p>
              <h1 className={clsx("text-2xl font-semibold", isLight ? "text-slate-900" : "text-white")}>{format(cursor, "MMMM yyyy")}</h1>
            </div>
            <div 
              className="flex items-center gap-1 border-l pl-4" 
              style={isLight ? { borderColor: "#e2e8f0" } : { borderColor: "#475569" }}
            >
              <button
                className={clsx(
                  "rounded border bg-transparent p-2 transition text-base",
                  isLight 
                    ? "border-slate-300 text-slate-600 hover:border-slate-400 hover:bg-slate-50" 
                    : "border-slate-600/80 text-slate-200 hover:border-cyan-400 hover:text-cyan-300"
                )}
                onClick={() => handleChangeMonth(-1)}
                aria-label="Previous month"
              >
                &#8592;
              </button>
              <button
                className={clsx(
                  "rounded border bg-transparent p-2 transition text-base",
                  isLight 
                    ? "border-slate-300 text-slate-600 hover:border-slate-400 hover:bg-slate-50" 
                    : "border-slate-600/80 text-slate-200 hover:border-cyan-400 hover:text-cyan-300"
                )}
                onClick={() => handleChangeMonth(1)}
                aria-label="Next month"
              >
                &#8594;
              </button>
              <select
                value={year}
                onChange={(event) => {
                  const nextYear = Number(event.target.value);
                  setCursor(new Date(nextYear, month, 1));
                }}
                className={clsx(
                  "rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 transition",
                  isLight 
                    ? "border-slate-300 bg-white text-slate-700 focus:ring-slate-400 focus:border-slate-400" 
                    : "border-slate-600/80 bg-slate-900/70 text-slate-100 focus:border-cyan-400"
                )}
              >
                {yearOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className={clsx("px-5 py-3", isLight ? "bg-slate-50 border border-slate-200 rounded-lg" : "rounded-lg border border-slate-700/50 bg-slate-800/50")}>
              <p className={clsx("text-xs uppercase tracking-wider font-medium mb-1", isLight ? "text-slate-500" : "text-slate-400")}>Month P&L</p>
              <p className={clsx("font-mono text-2xl font-semibold", monthTotal >= 0 ? (isLight ? "text-emerald-600" : "text-emerald-400") : (isLight ? "text-rose-600" : "text-rose-400"))}>{formatCurrency(monthTotal)}</p>
            </div>
            <div className="relative" ref={menuRef}>
              <button
                className={clsx(
                  "border px-4 py-2 text-sm font-medium transition",
                  isLight
                    ? "rounded border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400"
                    : "rounded border-slate-600/50 bg-slate-800/50 text-slate-200 hover:bg-slate-700/50 hover:border-slate-600"
                )}
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="Options"
              >
                Options
              </button>
              {menuOpen && (
                <div
                  className={clsx(
                    "absolute right-0 mt-2 w-full md:w-64 border p-4 z-50 shadow-lg",
                    isLight
                      ? "rounded-lg border-slate-200 bg-white"
                      : "rounded-lg border-slate-700/50 bg-slate-900/90"
                  )}
                >
                  <OptionsMenu
                    showTrades={showTrades}
                    onShowTradesChange={setShowTrades}
                    showTradeIdeas={showTradeIdeas}
                    onShowTradeIdeasChange={setShowTradeIdeas}
                    dateMode={dateMode}
                    onDateModeChange={setDateMode}
                    liveUpdates={liveUpdates}
                    onLiveUpdatesChange={setLiveUpdates}
                    calendarView={calendarView}
                    onCalendarViewChange={setCalendarView}
                    onJumpToToday={() => {
                      setCursor(startOfMonth(new Date()));
                      setMenuOpen(false);
                    }}
                    showWeekends={showWeekends}
                    onShowWeekendsChange={setShowWeekends}
                    theme={theme}
                    onThemeChange={(newTheme) => {
                      setTheme(newTheme);
                      setMenuOpen(false);
                    }}
                    isLight={isLight}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
        {error && <p className={clsx("mt-4 text-sm", isLight ? "text-rose-600" : "text-rose-400")}>{error}</p>}
      </header>

      <section className={calendarSurface}>
        <div
          className={clsx(
            "grid text-center text-xs font-medium uppercase tracking-wider",
            isLight ? "text-slate-600" : "text-slate-400",
            calendarView === "gallery" ? "gap-2 md:gap-2.5" : "gap-3 md:gap-4"
          )}
          style={{ gridTemplateColumns: showWeekends ? "repeat(7, minmax(0, 1fr))" : "repeat(5, minmax(0, 1fr))" }}
        >
          {weekdayLabels
            .filter((_, index) => showWeekends || (index !== 0 && index !== 6)) // Filter out Sunday (0) and Saturday (6)
            .map((label) => (
              <span key={label}>{label}</span>
            ))}
        </div>
        <div className="mt-4 space-y-3">
          {weeks.map((week, index) => {
            const weekSum = week.reduce((sum, date) => {
              const key = formatISO(date);
              const stats = dailyMap[key];
              return sum + (stats?.dailyPnl ?? 0);
            }, 0);
            const colCount = showWeekends ? 7 : 5;
            return (
              <div
                key={`${week[0].toISOString()}-${index}`}
                className={clsx(
                  "grid",
                  calendarView === "gallery" ? "gap-2 md:gap-2.5" : "gap-3 md:gap-4"
                )}
                style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr)) ${calendarView === "gallery" ? "60px md:70px" : "80px md:100px"}` }}
              >
                {week.map((date) => {
                    const key = formatISO(date);
                    const stats = dailyMap[key];
                    const isCurrentMonth = date.getMonth() === month;
                    const isFuture = date > today;
                    const isSelected = selectedDate === key;
                    const effectiveStats = isFuture ? null : stats;
                    const value = effectiveStats?.dailyPnl ?? 0;
                    const count = isFuture ? 0 : effectiveStats?.itemCount ?? 0;
                    const color = isFuture
                      ? isLight
                        ? "border border-dashed border-slate-200 bg-slate-50/50 text-slate-400"
                        : "border border-dashed border-slate-700/50 bg-slate-800/30 text-slate-500"
                      : !effectiveStats
                      ? isLight
                        ? "border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                        : "border border-slate-700/50 bg-slate-800/30 text-slate-400 hover:border-slate-600 hover:bg-slate-800/50"
                      : value > 0
                      ? isLight
                        ? "border border-emerald-300/50 bg-emerald-50/80 text-emerald-700 hover:border-emerald-400 hover:bg-emerald-50"
                        : "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:border-emerald-500/50 hover:bg-emerald-500/15"
                      : value < 0
                      ? isLight
                        ? "border border-rose-300/50 bg-rose-50/80 text-rose-700 hover:border-rose-400 hover:bg-rose-50"
                        : "border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:border-rose-500/50 hover:bg-rose-500/15"
                      : isLight
                      ? "border border-slate-200 bg-slate-50 text-slate-600"
                      : "border border-slate-700/50 bg-slate-800/30 text-slate-300";

                  return (
                    <button
                        key={key}
                        className={clsx(
                          "flex flex-col text-left transition border shadow-sm hover:shadow",
                          isLight ? "rounded" : "rounded-lg",
                          color,
                          isCurrentMonth ? "opacity-100" : "opacity-40",
                          isSelected && (isLight ? "ring-2 ring-slate-400" : "ring-2 ring-slate-500"),
                          calendarView === "gallery" 
                            ? "px-2 md:px-3 py-2 md:py-3" 
                            : "px-3 md:px-6 py-3 md:py-6"
                        )}
                        onClick={() => handleSelectDay(date)}
                        disabled={!isCurrentMonth || isFuture || (!showTrades && !showTradeIdeas)}
                      >
                        <span className={clsx(
                          "font-medium",
                          isLight ? "text-slate-500" : "text-slate-400",
                          calendarView === "gallery"
                            ? "text-xs md:text-sm mb-0.5 md:mb-1"
                            : "text-sm md:text-base mb-1 md:mb-2"
                        )}>{date.getDate()}</span>
                        <span className={clsx(
                          "font-semibold",
                          isLight ? "text-slate-900" : "text-white",
                          calendarView === "gallery"
                            ? "text-xs md:text-sm mb-0.5"
                            : "text-base md:text-lg mb-1"
                        )}>{formatCurrency(value)}</span>
                        {showTradeInfo && (
                          <span className={clsx(
                            isLight ? "text-slate-500" : "text-slate-300",
                            calendarView === "gallery"
                              ? "text-[10px] md:text-xs"
                              : "text-xs md:text-sm"
                          )}>
                            {isFuture ? `0 ${unitLabel}` : effectiveStats ? `${count} ${unitLabel}` : `No ${unitLabel}`}
                          </span>
                        )}
                      </button>
                    );
                })}
                <WeekBadge value={weekSum} theme={theme} />
              </div>
            );
          })}
        </div>
        {loadingCalendar && <p className="mt-4 text-center text-sm text-slate-400">Loading daily performance…</p>}
      </section>
      <section className={manageSurface}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className={clsx("text-xs uppercase tracking-wider font-medium", isLight ? "text-slate-600" : "text-slate-500")}>Manage data</p>
          <div className="flex flex-wrap gap-2 text-sm">
            <Link
              className={clsx(
                "px-4 py-2 font-medium transition border",
                isLight 
                  ? "rounded border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400" 
                  : "rounded border-slate-600/50 bg-slate-800/50 text-slate-200 hover:bg-slate-700/50 hover:border-slate-600"
              )}
              href="/analytics"
            >
              📊 Analytics
            </Link>
            <Link
              className={clsx(
                "px-4 py-2 font-medium transition border",
                isLight 
                  ? "rounded border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400" 
                  : "rounded border-slate-600/50 bg-slate-800/50 text-slate-200 hover:bg-slate-700/50 hover:border-slate-600"
              )}
              href="/upload"
            >
              Import MT5 report
            </Link>
            <Link
              className={clsx(
                "px-4 py-2 font-medium transition border",
                isLight 
                  ? "rounded border-rose-300 bg-white text-rose-700 hover:bg-rose-50 hover:border-rose-400" 
                  : "rounded border-rose-500/40 bg-slate-800/50 text-rose-300 hover:bg-rose-500/10 hover:border-rose-500/60"
              )}
              href="/upload#danger"
            >
              Erase all trades
            </Link>
          </div>
        </div>
      </section>

      {showTradeInfo && (
        <DayDetailPanel
          date={selectedDate}
          stats={selectedStats}
          items={detailItems}
          mode={detailMode}
          unitLabel={unitLabel}
          theme={theme}
          loading={loadingTrades}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </div>
  );
}

type SortOption = "time-asc" | "time-desc" | "profit-asc" | "profit-desc";

function DayDetailPanel({ date, stats, items, mode, unitLabel, loading, theme, onClose }: {
  date: string | null;
  stats: DailyPnl | null;
  items: (TradeWithNet | TradeIdeaSummary)[];
  mode: AggregationMode;
  unitLabel: string;
  theme: "dark" | "light";
  loading: boolean;
  onClose: () => void;
}) {
  // Hooks must be called before any conditional returns
  const [sortBy, setSortBy] = useState<SortOption>("time-desc");
  
  // Sort items based on selected option
  const sortedItems = useMemo(() => {
    if (mode === "trades") {
      const trades = items as TradeWithNet[];
      return [...trades].sort((a, b) => {
        if (sortBy === "time-asc") {
          // Sort by openTime for trades (oldest first)
          return new Date(a.openTime).getTime() - new Date(b.openTime).getTime();
        } else if (sortBy === "time-desc") {
          // Sort by openTime for trades (newest first)
          return new Date(b.openTime).getTime() - new Date(a.openTime).getTime();
        } else if (sortBy === "profit-asc") {
          return a.netPnl - b.netPnl;
        } else { // profit-desc
          return b.netPnl - a.netPnl;
        }
      });
    } else {
      const ideas = items as TradeIdeaSummary[];
      return [...ideas].sort((a, b) => {
        if (sortBy === "time-asc") {
          return new Date(a.closeTime).getTime() - new Date(b.closeTime).getTime();
        } else if (sortBy === "time-desc") {
          return new Date(b.closeTime).getTime() - new Date(a.closeTime).getTime();
        } else if (sortBy === "profit-asc") {
          return a.netPnl - b.netPnl;
        } else { // profit-desc
          return b.netPnl - a.netPnl;
        }
      });
    }
  }, [items, mode, sortBy]);

  // Early return after hooks
  if (!date) return null;
  
  const prettyDate = format(new Date(date), "MMMM d, yyyy");
  const isLight = theme === "light";
  const panelClass = isLight 
    ? "flex h-full w-full md:max-w-lg flex-col md:border-l border-t md:border-t-0 border-slate-200 bg-white p-4 md:p-6 shadow-lg" 
    : "flex h-full w-full md:max-w-lg flex-col md:border-l border-t md:border-t-0 border-slate-700/50 bg-slate-900/95 p-4 md:p-6 shadow-lg";

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-end bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <aside className={panelClass} onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <div>
            <p className={clsx("text-xs uppercase tracking-wider font-medium mb-1", isLight ? "text-slate-500" : "text-slate-400")}>{prettyDate}</p>
            <p className={clsx("text-xl md:text-2xl font-semibold mb-1", (stats?.dailyPnl ?? 0) >= 0 ? (isLight ? "text-emerald-600" : "text-emerald-400") : (isLight ? "text-rose-600" : "text-rose-400"))}>{stats ? formatCurrency(stats.dailyPnl) : "No P&L"}</p>
            <p className={clsx("text-xs", isLight ? "text-slate-500" : "text-slate-500")}>{stats ? `${stats.itemCount} ${unitLabel}` : `0 ${unitLabel}`}</p>
          </div>
          <button 
            onClick={onClose} 
            className={clsx(
              "text-2xl leading-none transition",
              isLight ? "text-slate-400 hover:text-slate-600" : "text-slate-400 hover:text-white"
            )}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        
        {/* Sort Controls */}
        {!loading && items.length > 0 && (
          <div className="mb-4">
            <label className={clsx("block text-xs font-medium mb-2", isLight ? "text-slate-600" : "text-slate-300")}>
              Sort by
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className={clsx(
                "w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 transition",
                isLight
                  ? "border-slate-300 bg-white text-slate-700 focus:ring-slate-400 focus:border-slate-400"
                  : "border-slate-600/80 bg-slate-800/70 text-slate-100 focus:border-cyan-400 focus:ring-cyan-400/50"
              )}
            >
              <option value="time-desc">⏰ Time (New → Old)</option>
              <option value="time-asc">⏰ Time (Old → New)</option>
              <option value="profit-desc">💰 Profit (High → Low)</option>
              <option value="profit-asc">💰 Profit (Low → High)</option>
            </select>
          </div>
        )}
        
        <div className="flex-1 overflow-y-auto pr-2">
          {loading && <p className={clsx("text-sm", isLight ? "text-slate-500" : "text-slate-400")}>Loading trades…</p>}
          {!loading && items.length === 0 && <p className={clsx("text-sm", isLight ? "text-slate-500" : "text-slate-500")}>No {unitLabel} for this day.</p>}
          {mode === "ideas" ? <IdeaList ideas={sortedItems as TradeIdeaSummary[]} isLight={isLight} /> : <TradeList trades={sortedItems as TradeWithNet[]} isLight={isLight} />}
        </div>
      </aside>
    </div>
  );
}

function TradeList({ trades, isLight }: { trades: TradeWithNet[]; isLight: boolean }) {
  return (
    <ul className="space-y-2">
      {trades.map((trade) => (
        <li
          key={trade.id}
          className={clsx(
            "border p-3 md:p-4 transition shadow-sm hover:shadow",
            isLight 
              ? "rounded-lg border-slate-200 bg-white" 
              : "rounded-lg border-slate-700/50 bg-slate-800/50 text-slate-300"
          )}
        >
          <div className={clsx("flex items-center justify-between text-xs md:text-sm mb-2", isLight ? "text-slate-700" : "text-slate-200")}>
            <span className="font-medium">{format(new Date(trade.closeTime), "HH:mm")}</span>
            <span className="font-semibold">{trade.symbol}</span>
          </div>
          <div className={clsx("mt-2 flex flex-wrap items-center gap-2 md:gap-3 text-[10px] md:text-xs", isLight ? "text-slate-500" : "text-slate-400")}>
            <span>{trade.type} {trade.volume.toFixed(2)} lots</span>
            <span>Open {trade.openPrice.toFixed(2)}</span>
            <span>Close {trade.closePrice.toFixed(2)}</span>
            <span>Commission {trade.commission.toFixed(2)}</span>
            <span>Swap {trade.swap.toFixed(2)}</span>
          </div>
          <div
            className={clsx(
              "mt-2 text-base md:text-lg font-semibold",
              trade.netPnl >= 0 
                ? (isLight ? "text-emerald-600" : "text-emerald-300") 
                : (isLight ? "text-rose-600" : "text-rose-300")
            )}
          >
            {formatCurrency(trade.netPnl)}
          </div>
        </li>
      ))}
    </ul>
  );
}

function IdeaList({ ideas, isLight }: { ideas: TradeIdeaSummary[]; isLight: boolean }) {
  return (
    <ul className="space-y-3">
      {ideas.map((idea) => (
        <li
          key={idea.ideaGroupKey}
          className={clsx(
            "border p-3 md:p-4 transition shadow-sm hover:shadow",
            isLight 
              ? "rounded-lg border-slate-200 bg-white" 
              : "rounded-lg border-slate-700/50 bg-slate-800/50 text-slate-300"
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 md:gap-3 mb-2">
            <div>
              <p className={clsx("text-xs uppercase tracking-wider font-medium mb-1", isLight ? "text-slate-500" : "text-slate-400")}>Trade idea</p>
              <p className={clsx("text-sm md:text-base font-semibold", isLight ? "text-slate-900" : "text-white")}>{idea.symbol} · {idea.type}</p>
            </div>
            <div
              className={clsx(
                "text-base md:text-lg font-semibold",
                idea.netPnl >= 0 
                  ? (isLight ? "text-emerald-600" : "text-emerald-400") 
                  : (isLight ? "text-rose-600" : "text-rose-400")
              )}
            >
              {formatCurrency(idea.netPnl)}
            </div>
          </div>
          <div className={clsx("mt-2 flex flex-wrap items-center gap-2 md:gap-4 text-[10px] md:text-xs", isLight ? "text-slate-500" : "text-slate-400")}>
            <span>Volume {idea.totalVolume.toFixed(2)} lots</span>
            <span>Legs {idea.legs.length}</span>
            <span>
              {format(new Date(idea.openTime), "HH:mm")} → {format(new Date(idea.closeTime), "HH:mm")}
            </span>
          </div>
          <div className={clsx("mt-3 space-y-2 rounded-lg border p-2 md:p-3", isLight ? "border-slate-200 bg-slate-50" : "border-slate-700/50 bg-slate-900/50")}>
            {idea.legs.map((leg) => (
              <div key={leg.id} className={clsx("flex flex-wrap items-center justify-between text-[10px] md:text-xs", isLight ? "text-slate-500" : "text-slate-400")}>
                <span>{format(new Date(leg.closeTime), "HH:mm:ss")}</span>
                <span>{leg.type} {leg.volume.toFixed(2)} lots</span>
                <span
                  className={clsx(
                    "font-semibold",
                    leg.netPnl >= 0 
                      ? (isLight ? "text-emerald-600" : "text-emerald-300") 
                      : (isLight ? "text-rose-600" : "text-rose-300")
                  )}
                >
                  {formatCurrency(leg.netPnl)}
                </span>
              </div>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}

function WeekBadge({ value, theme }: { value: number; theme: "dark" | "light" }) {
  const isLight = theme === "light";
  const positive = value > 0;
  const negative = value < 0;
  const color = positive
    ? isLight
      ? "text-emerald-700 border-emerald-300/50 bg-emerald-50/80"
      : "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
    : negative
    ? isLight
      ? "text-rose-700 border-rose-300/50 bg-rose-50/80"
      : "text-rose-400 border-rose-500/30 bg-rose-500/10"
    : isLight
    ? "text-slate-600 border-slate-200 bg-slate-50"
    : "text-slate-300 border-slate-700/50 bg-slate-800/50";
  return (
    <div className={clsx(
      "flex items-center justify-center border px-2 py-4 text-center text-xs font-semibold shadow-sm rounded-lg",
      color
    )}>
      <div>
        <p className={clsx("text-[10px] uppercase tracking-wider font-medium mb-1", isLight ? "text-slate-500" : "text-slate-400")}>Week</p>
        <p className="text-sm">{formatCurrency(value)}</p>
      </div>
    </div>
  );
}

function OptionsMenu({
  showTrades,
  onShowTradesChange,
  showTradeIdeas,
  onShowTradeIdeasChange,
  dateMode,
  onDateModeChange,
  liveUpdates,
  onLiveUpdatesChange,
  calendarView,
  onCalendarViewChange,
  onJumpToToday,
  showWeekends,
  onShowWeekendsChange,
  theme,
  onThemeChange,
  isLight,
}: {
  showTrades: boolean;
  onShowTradesChange: (show: boolean) => void;
  showTradeIdeas: boolean;
  onShowTradeIdeasChange: (show: boolean) => void;
  dateMode: DateMode;
  onDateModeChange: (mode: DateMode) => void;
  liveUpdates: boolean;
  onLiveUpdatesChange: (enabled: boolean) => void;
  calendarView: "gallery" | "inline";
  onCalendarViewChange: (view: "gallery" | "inline") => void;
  onJumpToToday: () => void;
  showWeekends: boolean;
  onShowWeekendsChange: (show: boolean) => void;
  theme: "dark" | "light";
  onThemeChange: (theme: "dark" | "light") => void;
  isLight: boolean;
}) {
  const sectionClass = "space-y-3";
  const labelClass = clsx("text-xs font-medium uppercase tracking-wider", isLight ? "text-slate-600" : "text-slate-300");
  const dividerClass = clsx("my-4 border-t", isLight ? "border-slate-200" : "border-slate-700/50");

  return (
    <div className="space-y-4">
      {/* View Section */}
      <div className={sectionClass}>
        <p className={labelClass}>View</p>
        <div className="space-y-2">
          <label className="flex items-center justify-between cursor-pointer">
            <span className={clsx("text-sm", isLight ? "text-slate-700" : "text-slate-200")}>Show trades</span>
            <input
              type="checkbox"
              checked={showTrades}
              onChange={(e) => onShowTradesChange(e.target.checked)}
              className="h-4 w-4 cursor-pointer"
            />
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <span className={clsx("text-sm", isLight ? "text-slate-700" : "text-slate-200")}>Show trade ideas</span>
            <input
              type="checkbox"
              checked={showTradeIdeas}
              onChange={(e) => onShowTradeIdeasChange(e.target.checked)}
              className="h-4 w-4 cursor-pointer"
            />
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <span className={clsx("text-sm", isLight ? "text-slate-700" : "text-slate-200")}>Hide all</span>
            <input
              type="checkbox"
              checked={!showTrades && !showTradeIdeas}
              onChange={(e) => {
                if (e.target.checked) {
                  onShowTradesChange(false);
                  onShowTradeIdeasChange(false);
                }
              }}
              className="h-4 w-4 cursor-pointer"
            />
          </label>
        </div>
      </div>

      <div className={dividerClass} />

      {/* Calendar Section */}
      <div className={sectionClass}>
        <p className={labelClass}>Calendar</p>
        <div className="space-y-2">
          <button
            onClick={onJumpToToday}
            className={clsx(
              "w-full border px-3 py-2 text-left text-sm transition font-medium",
              isLight
                ? "rounded border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400"
                : "rounded-lg border-slate-600 bg-slate-800/50 text-slate-200 hover:bg-slate-700/50"
            )}
          >
            ⏺ Jump to today
          </button>
          <label className="flex items-center justify-between cursor-pointer">
            <span className={clsx("text-sm", isLight ? "text-slate-700" : "text-slate-200")}>Show weekends</span>
            <input
              type="checkbox"
              checked={showWeekends}
              onChange={(e) => onShowWeekendsChange(e.target.checked)}
              className="h-4 w-4 cursor-pointer"
            />
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <span className={clsx("text-sm", isLight ? "text-slate-700" : "text-slate-200")}>🔄 Live updates</span>
            <input
              type="checkbox"
              checked={liveUpdates}
              onChange={(e) => onLiveUpdatesChange(e.target.checked)}
              className="h-4 w-4 cursor-pointer"
            />
          </label>
          <div className="space-y-2 pt-2">
            <p className={clsx("text-xs font-medium", isLight ? "text-slate-600" : "text-slate-400")}>Layout</p>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="calendarView"
                value="gallery"
                checked={calendarView === "gallery"}
                onChange={() => onCalendarViewChange("gallery")}
                className="h-4 w-4 cursor-pointer"
              />
              <span className={clsx("text-sm", isLight ? "text-slate-700" : "text-slate-200")}>🖼️ Gallery (compact)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="calendarView"
                value="inline"
                checked={calendarView === "inline"}
                onChange={() => onCalendarViewChange("inline")}
                className="h-4 w-4 cursor-pointer"
              />
              <span className={clsx("text-sm", isLight ? "text-slate-700" : "text-slate-200")}>📋 Inline (spacious)</span>
            </label>
          </div>
        </div>
      </div>

      <div className={dividerClass} />

      {/* Date Mode Section */}
      <div className={sectionClass}>
        <p className={labelClass}>Date Attribution</p>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="dateMode"
              value="open"
              checked={dateMode === "open"}
              onChange={() => onDateModeChange("open")}
              className="h-4 w-4 cursor-pointer"
            />
            <span className={clsx("text-sm", isLight ? "text-slate-700" : "text-slate-200")}>📅 Open date</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="dateMode"
              value="close"
              checked={dateMode === "close"}
              onChange={() => onDateModeChange("close")}
              className="h-4 w-4 cursor-pointer"
            />
            <span className={clsx("text-sm", isLight ? "text-slate-700" : "text-slate-200")}>🔒 Close date</span>
          </label>
        </div>
      </div>

      <div className={dividerClass} />

      {/* Theme Section */}
      <div className={sectionClass}>
        <p className={labelClass}>Theme</p>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="theme"
              value="light"
              checked={theme === "light"}
              onChange={() => onThemeChange("light")}
              className="h-4 w-4 cursor-pointer"
            />
            <span className={clsx("text-sm", isLight ? "text-slate-700" : "text-slate-200")}>☀️ Light mode</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="theme"
              value="dark"
              checked={theme === "dark"}
              onChange={() => onThemeChange("dark")}
              className="h-4 w-4 cursor-pointer"
            />
            <span className={clsx("text-sm", isLight ? "text-slate-700" : "text-slate-200")}>🌙 Dark mode</span>
          </label>
        </div>
      </div>
    </div>
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
