"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { format } from "date-fns";

interface EquityPoint {
  date: string;
  equity: number;
  drawdown: number;
  netPnl: number;
}

interface EquityCurveProps {
  dateRange: { from: string; to: string };
  theme: "dark" | "light";
}

type SeriesPoint = { x: number; y: number };

export function EquityCurve({ dateRange, theme }: EquityCurveProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    equityCurve: EquityPoint[];
    peakEquity: number;
    maxDrawdown: number;
    finalEquity: number;
  } | null>(null);
  const [showMarkers, setShowMarkers] = useState(true);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [pinnedIndex, setPinnedIndex] = useState<number | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [animated, setAnimated] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  const isLight = theme === "light";
  const surfaceClass = isLight
    ? "rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
    : "rounded-lg border border-slate-700/50 bg-slate-900/50 p-6 shadow-sm";

  useEffect(() => {
    setIsTouchDevice(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setAnimated(false);
      setActiveIndex(null);
      setPinnedIndex(null);
      try {
        const response = await fetch(
          `/api/analytics/equity-curve?from=${dateRange.from}&to=${dateRange.to}`
        );
        if (!response.ok) throw new Error("Failed to load equity curve");
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

  useEffect(() => {
    if (!loading && data?.equityCurve.length) {
      const id = window.requestAnimationFrame(() => setAnimated(true));
      return () => window.cancelAnimationFrame(id);
    }
  }, [loading, data]);

  if (loading) {
    return (
      <div className={surfaceClass}>
        <h2 className={clsx("text-lg font-semibold mb-2", isLight ? "text-slate-900" : "text-white")}>
          Equity & Drawdown
        </h2>
        <p className={clsx("text-sm", isLight ? "text-slate-500" : "text-slate-400")}>Loading chart...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={surfaceClass}>
        <h2 className={clsx("text-lg font-semibold mb-2", isLight ? "text-slate-900" : "text-white")}>
          Equity & Drawdown
        </h2>
        <p className={clsx("text-sm", isLight ? "text-rose-600" : "text-rose-400")}>{error}</p>
      </div>
    );
  }

  if (!data || data.equityCurve.length === 0) {
    return (
      <div className={surfaceClass}>
        <h2 className={clsx("text-lg font-semibold mb-2", isLight ? "text-slate-900" : "text-white")}>
          Equity & Drawdown
        </h2>
        <p className={clsx("text-sm text-center py-8", isLight ? "text-slate-500" : "text-slate-400")}>
          No data available for the selected date range.
        </p>
      </div>
    );
  }

  const { equityCurve, peakEquity, maxDrawdown, finalEquity } = data;
  const selectedIndex = pinnedIndex ?? activeIndex;
  const selectedPoint = selectedIndex !== null ? equityCurve[selectedIndex] : null;

  const peakIndex = equityCurve.reduce(
    (maxIdx, point, idx, arr) => (point.equity > arr[maxIdx].equity ? idx : maxIdx),
    0
  );
  const maxDrawdownIndex = equityCurve.reduce(
    (maxIdx, point, idx, arr) => (point.drawdown > arr[maxIdx].drawdown ? idx : maxIdx),
    0
  );

  const minEquity = Math.min(...equityCurve.map((pt) => pt.equity));
  const maxEquity = Math.max(...equityCurve.map((pt) => pt.equity));
  const equityPadding = (maxEquity - minEquity) * 0.08 || 100;
  const equityMin = minEquity - equityPadding;
  const equityMax = maxEquity + equityPadding;
  const equityRange = equityMax - equityMin || 1;

  const maxDD = Math.max(...equityCurve.map((pt) => pt.drawdown), 1);
  const ddRange = maxDD * 1.1;

  const chartHeight = 470;
  const chartWidth = Math.max(820, equityCurve.length * 2.4);
  const padding = { top: 24, right: 28, bottom: 52, left: 86 };
  const paneGap = 28;
  const equityPaneHeight = 260;
  const drawdownPaneHeight = 106;
  const graphWidth = chartWidth - padding.left - padding.right;
  const equityPaneBottom = padding.top + equityPaneHeight;
  const drawdownPaneTop = equityPaneBottom + paneGap;
  const drawdownPaneBottom = drawdownPaneTop + drawdownPaneHeight;

  const getX = (index: number) => padding.left + (index / (equityCurve.length - 1 || 1)) * graphWidth;
  const getEquityY = (value: number) => padding.top + equityPaneHeight - ((value - equityMin) / equityRange) * equityPaneHeight;
  const getDrawdownY = (value: number) =>
    drawdownPaneTop + ((ddRange - value) / ddRange) * drawdownPaneHeight;

  const equityPoints: SeriesPoint[] = equityCurve.map((point, idx) => ({
    x: getX(idx),
    y: getEquityY(point.equity),
  }));

  const equitySmoothPath = buildSmoothPath(equityPoints);
  const equityAreaPath = [
    `M ${equityPoints[0].x} ${equityPaneBottom}`,
    ...equityPoints.map((p) => `L ${p.x} ${p.y}`),
    `L ${equityPoints[equityPoints.length - 1].x} ${equityPaneBottom}`,
    "Z",
  ].join(" ");

  const xAxisInterval = Math.max(1, Math.floor(equityCurve.length / 7));
  const xAxisPoints = equityCurve
    .map((point, idx) => ({ point, idx }))
    .filter(({ idx }) => idx % xAxisInterval === 0 || idx === equityCurve.length - 1);

  const valley = maxDrawdownIndex;
  const target = equityCurve[valley].equity + (peakEquity - equityCurve[valley].equity) * 0.5;
  const recoveryIdx = equityCurve.findIndex((p, idx) => idx > valley && p.equity >= target);
  const recoveryDays =
    recoveryIdx < 0
      ? null
      : Math.ceil(
          (new Date(equityCurve[recoveryIdx].date).getTime() - new Date(equityCurve[valley].date).getTime()) /
            (1000 * 60 * 60 * 24)
        );

  const handlePointerMove = (clientX: number) => {
    if (!chartRef.current) return;
    const rect = chartRef.current.getBoundingClientRect();
    const scrollLeft = chartRef.current.scrollLeft;
    const x = clientX - rect.left + scrollLeft;
    const normalizedX = (x - padding.left) / graphWidth;
    const idx = Math.max(0, Math.min(equityCurve.length - 1, Math.round(normalizedX * (equityCurve.length - 1))));
    setActiveIndex(idx);
  };

  const tooltipX = selectedIndex !== null ? getX(selectedIndex) : 0;
  const tooltipLeft = Math.max(
    padding.left + 6,
    Math.min(tooltipX + 12, chartWidth - padding.right - 204)
  );
  const tooltipTop = selectedIndex !== null
    ? Math.max(8, getEquityY(equityCurve[selectedIndex].equity) - 94)
    : 0;

  return (
    <div className={surfaceClass}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className={clsx("text-lg font-semibold", isLight ? "text-slate-900" : "text-white")}>
            Equity & Drawdown
          </h2>
          <p className={clsx("mt-1 text-xs", isLight ? "text-slate-500" : "text-slate-400")}>
            Smoothed equity trend with risk pane for faster drawdown reading.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowMarkers((prev) => !prev)}
          className={clsx(
            "rounded-full border px-3 py-1.5 text-xs font-medium transition",
            showMarkers
              ? isLight
                ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                : "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
              : isLight
              ? "border-slate-300 bg-white text-slate-600"
              : "border-slate-600/70 bg-slate-800/50 text-slate-300"
          )}
        >
          Markers
        </button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        <MetricCard
          label="Final Equity"
          value={money(finalEquity)}
          tone={finalEquity >= 0 ? "up" : "down"}
          light={isLight}
        />
        <MetricCard label="Peak Equity" value={money(peakEquity)} tone="neutral" light={isLight} />
        <MetricCard
          label="Max Drawdown"
          value={money(maxDrawdown)}
          subValue={`${peakEquity > 0 ? ((maxDrawdown / peakEquity) * 100).toFixed(2) : "0.00"}%`}
          tone="down"
          light={isLight}
        />
        {recoveryDays !== null && (
          <MetricCard label="Recovery" value={`${recoveryDays} days`} tone="neutral" light={isLight} />
        )}
        <MetricCard label="Trades" value={`${equityCurve.length}`} tone="neutral" light={isLight} />
      </div>

      <div
        className="relative overflow-x-auto"
        ref={chartRef}
        onMouseMove={(e) => {
          if (isTouchDevice || pinnedIndex !== null) return;
          handlePointerMove(e.clientX);
        }}
        onMouseLeave={() => {
          if (pinnedIndex === null) setActiveIndex(null);
        }}
        onClick={(e) => {
          if (!isTouchDevice) return;
          handlePointerMove(e.clientX);
          const next = activeIndex;
          setPinnedIndex((prev) => (prev === next ? null : next));
        }}
      >
        <div className="relative" style={{ minWidth: `${chartWidth}px` }}>
          <svg
            className="w-full"
            style={{ height: `${chartHeight}px` }}
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <linearGradient id="eq-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={isLight ? "#10b981" : "#34d399"} stopOpacity="0.28" />
                <stop offset="100%" stopColor={isLight ? "#10b981" : "#34d399"} stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {[0, 1, 2, 3, 4].map((i) => {
              const value = equityMin + (equityRange * i) / 4;
              const y = getEquityY(value);
              return (
                <g key={`eq-grid-${i}`}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={chartWidth - padding.right}
                    y2={y}
                    stroke={isLight ? "#e2e8f0" : "#334155"}
                    strokeDasharray="3 3"
                  />
                  <text
                    x={padding.left - 10}
                    y={y + 4}
                    textAnchor="end"
                    className={clsx("text-xs", isLight ? "fill-slate-500" : "fill-slate-400")}
                  >
                    {moneyShort(value)}
                  </text>
                </g>
              );
            })}

            {[0, 1, 2, 3].map((i) => {
              const value = (ddRange * i) / 3;
              const y = getDrawdownY(value);
              return (
                <g key={`dd-grid-${i}`}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={chartWidth - padding.right}
                    y2={y}
                    stroke={isLight ? "#fee2e2" : "#3f1f26"}
                    strokeDasharray="2 4"
                  />
                  <text
                    x={padding.left - 10}
                    y={y + 4}
                    textAnchor="end"
                    className={clsx("text-xs", isLight ? "fill-rose-500" : "fill-rose-400")}
                  >
                    {moneyShort(value)}
                  </text>
                </g>
              );
            })}

            <line
              x1={padding.left}
              y1={padding.top}
              x2={padding.left}
              y2={drawdownPaneBottom}
              stroke={isLight ? "#64748b" : "#94a3b8"}
              strokeWidth="1.5"
            />
            <line
              x1={padding.left}
              y1={drawdownPaneBottom}
              x2={chartWidth - padding.right}
              y2={drawdownPaneBottom}
              stroke={isLight ? "#64748b" : "#94a3b8"}
              strokeWidth="1.5"
            />

            <path d={equityAreaPath} fill="url(#eq-area)" style={{ opacity: animated ? 1 : 0, transition: "opacity 400ms ease" }} />
            <path
              d={equitySmoothPath}
              fill="none"
              stroke="#10b981"
              strokeWidth="3"
              strokeLinecap="round"
              style={{
                strokeDasharray: 2200,
                strokeDashoffset: animated ? 0 : 2200,
                transition: "stroke-dashoffset 900ms cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            />

            {equityCurve.map((point, idx) => {
              const x = getX(idx);
              const barTop = getDrawdownY(point.drawdown);
              const barHeight = drawdownPaneBottom - barTop;
              const width = Math.max(2, graphWidth / equityCurve.length - 1);
              return (
                <rect
                  key={`dd-bar-${idx}`}
                  x={x - width / 2}
                  y={barTop}
                  width={width}
                  height={barHeight}
                  fill={idx === maxDrawdownIndex ? "#ef4444" : isLight ? "rgba(239,68,68,0.45)" : "rgba(239,68,68,0.6)"}
                  rx="1"
                />
              );
            })}

            {xAxisPoints.map(({ point, idx }) => {
              const x = getX(idx);
              return (
                <g key={`x-tick-${idx}`}>
                  <line
                    x1={x}
                    y1={drawdownPaneBottom}
                    x2={x}
                    y2={drawdownPaneBottom + 4}
                    stroke={isLight ? "#94a3b8" : "#64748b"}
                  />
                  <text
                    x={x}
                    y={drawdownPaneBottom + 18}
                    textAnchor="middle"
                    className={clsx("text-xs", isLight ? "fill-slate-500" : "fill-slate-400")}
                  >
                    {format(new Date(point.date), "MMM d")}
                  </text>
                </g>
              );
            })}

            {showMarkers && (
              <>
                <circle cx={getX(peakIndex)} cy={getEquityY(equityCurve[peakIndex].equity)} r="5.5" fill="#10b981" />
                <text
                  x={getX(peakIndex)}
                  y={getEquityY(equityCurve[peakIndex].equity) - 10}
                  textAnchor="middle"
                  className={clsx("text-xs font-semibold", isLight ? "fill-slate-900" : "fill-emerald-300")}
                >
                  Peak
                </text>
                <circle cx={getX(maxDrawdownIndex)} cy={getEquityY(equityCurve[maxDrawdownIndex].equity)} r="5.5" fill="#ef4444" />
                <text
                  x={getX(maxDrawdownIndex)}
                  y={getEquityY(equityCurve[maxDrawdownIndex].equity) + 18}
                  textAnchor="middle"
                  className={clsx("text-xs font-semibold", isLight ? "fill-slate-900" : "fill-rose-300")}
                >
                  Max DD
                </text>
              </>
            )}

            {selectedIndex !== null && (
              <line
                x1={getX(selectedIndex)}
                y1={padding.top}
                x2={getX(selectedIndex)}
                y2={drawdownPaneBottom}
                stroke={isLight ? "#94a3b8" : "#64748b"}
                strokeDasharray="3 4"
              />
            )}
          </svg>

          {selectedPoint && (
            <div
              className={clsx(
                "pointer-events-none absolute z-20 w-[196px] rounded-lg border p-3 shadow-lg backdrop-blur-sm",
                isLight
                  ? "border-slate-200 bg-white/95 text-slate-800"
                  : "border-slate-700 bg-slate-900/90 text-slate-100"
              )}
              style={{ left: `${tooltipLeft}px`, top: `${tooltipTop}px` }}
            >
              <p className={clsx("text-xs font-semibold", isLight ? "text-slate-700" : "text-slate-100")}>
                {format(new Date(selectedPoint.date), "MMM d, yyyy")}
              </p>
              <p className="mt-1 text-xs">Equity: {money(selectedPoint.equity)}</p>
              <p className="text-xs">
                P&L:{" "}
                <span className={selectedPoint.netPnl >= 0 ? "text-emerald-500" : "text-rose-500"}>
                  {selectedPoint.netPnl >= 0 ? "+" : ""}
                  {money(selectedPoint.netPnl)}
                </span>
              </p>
              <p className="text-xs text-rose-500">Drawdown: {money(selectedPoint.drawdown)}</p>
              {isTouchDevice && (
                <p className={clsx("mt-1 text-[10px]", isLight ? "text-slate-500" : "text-slate-400")}>
                  Tap chart again to clear
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function buildSmoothPath(points: SeriesPoint[]): string {
  if (points.length < 2) return "";
  if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;

  const path: string[] = [`M ${points[0].x} ${points[0].y}`];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`);
  }
  return path.join(" ");
}

function money(value: number): string {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function moneyShort(value: number): string {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

function MetricCard({
  label,
  value,
  subValue,
  tone,
  light,
}: {
  label: string;
  value: string;
  subValue?: string;
  tone: "up" | "down" | "neutral";
  light: boolean;
}) {
  const toneClass =
    tone === "up"
      ? light
        ? "text-emerald-600"
        : "text-emerald-400"
      : tone === "down"
      ? light
        ? "text-rose-600"
        : "text-rose-400"
      : light
      ? "text-slate-900"
      : "text-white";

  return (
    <div className={clsx("rounded-lg border p-3", light ? "border-slate-200 bg-slate-50" : "border-slate-700/50 bg-slate-800/50")}>
      <p className={clsx("text-[10px] uppercase tracking-wider font-medium", light ? "text-slate-500" : "text-slate-400")}>
        {label}
      </p>
      <p className={clsx("mt-1 text-lg font-semibold", toneClass)}>{value}</p>
      {subValue && <p className={clsx("text-xs", light ? "text-slate-500" : "text-slate-400")}>{subValue}</p>}
    </div>
  );
}

