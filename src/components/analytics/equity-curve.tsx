"use client";

import { useEffect, useState, useRef } from "react";
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

export function EquityCurve({ dateRange, theme }: EquityCurveProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    equityCurve: EquityPoint[];
    peakEquity: number;
    maxDrawdown: number;
    finalEquity: number;
  } | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<{ point: EquityPoint; x: number; y: number } | null>(null);
  const [showDrawdown, setShowDrawdown] = useState(true);
  const chartRef = useRef<HTMLDivElement>(null);

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

  if (!data) return null;

  const { equityCurve, peakEquity, maxDrawdown, finalEquity } = data;
  
  // Find key points with tolerance for floating point comparison
  const minEquityValue = Math.min(...equityCurve.map((pt) => pt.equity));
  const maxDrawdownIndex = equityCurve.findIndex((p) => Math.abs(p.equity - minEquityValue) < 0.01);
  
  // Find peak equity index (with tolerance)
  const peakEquityIndex = equityCurve.findIndex((p) => Math.abs(p.equity - peakEquity) < 0.01);
  
  // If exact match not found, find the index with maximum equity value
  const actualPeakIndex = equityCurve.reduce((maxIdx, point, idx, arr) => 
    point.equity > arr[maxIdx].equity ? idx : maxIdx, 0
  );
  const finalPeakIndex = peakEquityIndex >= 0 ? peakEquityIndex : actualPeakIndex;

  // Calculate recovery time (time from max drawdown back to 50% recovery)
  let recoveryTime = null;
  if (maxDrawdownIndex >= 0) {
    const lowestEquity = equityCurve[maxDrawdownIndex].equity;
    const targetRecoveryEquity = lowestEquity + (peakEquity - lowestEquity) * 0.5;
    const recoveryIndex = equityCurve.findIndex(
      (p, idx) => idx > maxDrawdownIndex && p.equity >= targetRecoveryEquity
    );
    if (recoveryIndex >= 0) {
      const startDate = new Date(equityCurve[maxDrawdownIndex].date);
      const recoveryDate = new Date(equityCurve[recoveryIndex].date);
      recoveryTime = Math.ceil((recoveryDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    }
  }

  // Calculate min/max for proper scaling (don't force 0 as minimum)
  const minEquity = Math.min(...equityCurve.map((p) => p.equity));
  const maxEquity = Math.max(...equityCurve.map((p) => p.equity), peakEquity);
  // Add some padding to the range for better visualization
  const rangePadding = (maxEquity - minEquity) * 0.05 || 100;
  const range = (maxEquity - minEquity) + (rangePadding * 2) || 1;
  const adjustedMinEquity = minEquity - rangePadding;

  const chartHeight = 400;
  // Calculate chart width: minimum 800px, or 3px per data point, whichever is larger
  const chartWidth = Math.max(800, equityCurve.length * 3);
  const padding = { top: 20, right: 40, bottom: 60, left: 80 };
  const graphWidth = chartWidth - padding.left - padding.right;
  const graphHeight = chartHeight - padding.top - padding.bottom;

  const getXPosition = (index: number) => {
    return padding.left + (index / (equityCurve.length - 1 || 1)) * graphWidth;
  };

  const getYPosition = (value: number) => {
    return padding.top + graphHeight - ((value - adjustedMinEquity) / range) * graphHeight;
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!chartRef.current) return;
    const rect = chartRef.current.getBoundingClientRect();
    const scrollLeft = chartRef.current.scrollLeft || 0;
    const x = e.clientX - rect.left + scrollLeft;
    
    // Clamp x to valid range
    const clampedX = Math.max(padding.left, Math.min(x, chartWidth - padding.right));
    
    // Find closest point
    const normalizedX = (clampedX - padding.left) / graphWidth;
    const pointIndex = Math.round(normalizedX * (equityCurve.length - 1));
    const clampedIndex = Math.max(0, Math.min(equityCurve.length - 1, pointIndex));
    const point = equityCurve[clampedIndex];
    
    setHoveredPoint({
      point,
      x: getXPosition(clampedIndex),
      y: getYPosition(point.equity),
    });
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  // Generate Y-axis labels (with adjusted range)
  const yAxisLabels = 5;
  const yAxisValues: number[] = [];
  for (let i = 0; i <= yAxisLabels; i++) {
    const value = adjustedMinEquity + (range * i) / yAxisLabels;
    yAxisValues.push(Number(value.toFixed(2)));
  }

  // Generate X-axis labels (every 10th point or so)
  const xAxisInterval = Math.max(1, Math.floor(equityCurve.length / 8));
  const xAxisPoints = equityCurve.filter((_, idx) => idx % xAxisInterval === 0 || idx === equityCurve.length - 1);

  return (
    <div className={surfaceClass}>
      <h2 className={clsx("text-lg font-semibold mb-4", isLight ? "text-slate-900" : "text-white")}>
        Equity Curve & Drawdown
      </h2>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
        <div className={clsx("p-4 rounded-lg border", isLight ? "border-slate-200 bg-slate-50" : "border-slate-700/50 bg-slate-800/50")}>
          <p className={clsx("text-xs uppercase tracking-wider font-medium mb-1", isLight ? "text-slate-500" : "text-slate-400")}>
            Final Equity
          </p>
          <p className={clsx("text-2xl font-semibold", finalEquity >= 0 ? (isLight ? "text-emerald-600" : "text-emerald-400") : (isLight ? "text-rose-600" : "text-rose-400"))}>
            ${finalEquity.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className={clsx("p-4 rounded-lg border", isLight ? "border-slate-200 bg-slate-50" : "border-slate-700/50 bg-slate-800/50")}>
          <p className={clsx("text-xs uppercase tracking-wider font-medium mb-1", isLight ? "text-slate-500" : "text-slate-400")}>
            Peak Equity
          </p>
          <p className={clsx("text-2xl font-semibold", isLight ? "text-slate-900" : "text-white")}>
            ${peakEquity.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className={clsx("p-4 rounded-lg border", isLight ? "border-slate-200 bg-slate-50" : "border-slate-700/50 bg-slate-800/50")}>
          <p className={clsx("text-xs uppercase tracking-wider font-medium mb-1", isLight ? "text-slate-500" : "text-slate-400")}>
            Max Drawdown
          </p>
          <p className={clsx("text-2xl font-semibold", isLight ? "text-rose-600" : "text-rose-400")}>
            ${maxDrawdown.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className={clsx("text-xs mt-1", isLight ? "text-slate-500" : "text-slate-400")}>
            {peakEquity > 0 ? ((maxDrawdown / peakEquity) * 100).toFixed(2) : "0.00"}%
          </p>
        </div>
        {recoveryTime !== null && (
          <div className={clsx("p-4 rounded-lg border", isLight ? "border-slate-200 bg-slate-50" : "border-slate-700/50 bg-slate-800/50")}>
            <p className={clsx("text-xs uppercase tracking-wider font-medium mb-1", isLight ? "text-slate-500" : "text-slate-400")}>
              Recovery Time
            </p>
            <p className={clsx("text-2xl font-semibold", isLight ? "text-slate-900" : "text-white")}>
              {recoveryTime} days
            </p>
          </div>
        )}
        <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showDrawdown}
              onChange={(e) => setShowDrawdown(e.target.checked)}
              className="h-4 w-4 cursor-pointer"
            />
            <span className={clsx("text-sm", isLight ? "text-slate-700" : "text-slate-300")}>Show Drawdown</span>
          </label>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-emerald-500" />
          <span className={clsx("text-xs", isLight ? "text-slate-600" : "text-slate-400")}>Equity Curve</span>
        </div>
        {showDrawdown && (
          <>
            <div className="flex items-center gap-2">
              <div className={clsx("w-4 h-8 rounded", isLight ? "bg-rose-500/20" : "bg-rose-500/30")} />
              <span className={clsx("text-xs", isLight ? "text-slate-600" : "text-slate-400")}>Drawdown Area</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 border-t-2 border-dashed border-rose-500" />
              <span className={clsx("text-xs", isLight ? "text-slate-600" : "text-slate-400")}>Drawdown Line</span>
            </div>
          </>
        )}
        {maxDrawdownIndex >= 0 && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-rose-500" />
            <span className={clsx("text-xs", isLight ? "text-slate-600" : "text-slate-400")}>Max Drawdown</span>
          </div>
        )}
        {peakEquityIndex >= 0 && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className={clsx("text-xs", isLight ? "text-slate-600" : "text-slate-400")}>Peak Equity</span>
          </div>
        )}
      </div>

      {loading && (
        <p className={clsx("text-sm", isLight ? "text-slate-500" : "text-slate-400")}>Loading equity curve...</p>
      )}

      {error && (
        <p className={clsx("text-sm", isLight ? "text-rose-600" : "text-rose-400")}>{error}</p>
      )}

      {!loading && !error && equityCurve.length > 0 && (
        <div className="relative overflow-x-auto" ref={chartRef}>
          <div style={{ minWidth: `${chartWidth}px` }}>
            <svg
              className="w-full"
              style={{ height: `${chartHeight}px` }}
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              preserveAspectRatio="none"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              {/* Grid lines (horizontal) */}
              {yAxisValues.map((value, idx) => {
                const y = getYPosition(value);
                return (
                  <g key={`grid-h-${idx}`}>
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={chartWidth - padding.right}
                      y2={y}
                      stroke={isLight ? "#e2e8f0" : "#475569"}
                      strokeWidth="1"
                      strokeDasharray="2 2"
                    />
                    {/* Y-axis labels */}
                    <text
                      x={padding.left - 10}
                      y={y + 4}
                      textAnchor="end"
                      className={clsx("text-xs", isLight ? "fill-slate-600" : "fill-slate-400")}
                    >
                      ${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                    </text>
                  </g>
                );
              })}

              {/* X-axis labels */}
              {xAxisPoints.map((point, idx) => {
                const pointIndex = equityCurve.findIndex((p) => p.date === point.date);
                if (pointIndex < 0) return null;
                const x = getXPosition(pointIndex);
                return (
                  <g key={`x-label-${idx}`}>
                    <line
                      x1={x}
                      y1={chartHeight - padding.bottom}
                      x2={x}
                      y2={chartHeight - padding.bottom + 5}
                      stroke={isLight ? "#64748b" : "#94a3b8"}
                      strokeWidth="1"
                    />
                    <text
                      x={x}
                      y={chartHeight - padding.bottom + 20}
                      textAnchor="middle"
                      className={clsx("text-xs", isLight ? "fill-slate-600" : "fill-slate-400")}
                      transform={`rotate(-45 ${x} ${chartHeight - padding.bottom + 20})`}
                    >
                      {format(new Date(point.date), "MMM d")}
                    </text>
                  </g>
                );
              })}

              {/* Axis lines */}
              <line
                x1={padding.left}
                y1={padding.top}
                x2={padding.left}
                y2={chartHeight - padding.bottom}
                stroke={isLight ? "#64748b" : "#94a3b8"}
                strokeWidth="2"
              />
              <line
                x1={padding.left}
                y1={chartHeight - padding.bottom}
                x2={chartWidth - padding.right}
                y2={chartHeight - padding.bottom}
                stroke={isLight ? "#64748b" : "#94a3b8"}
                strokeWidth="2"
              />

              {/* Drawdown area (behind equity curve) */}
              {showDrawdown && (
                <polygon
                  points={`${padding.left},${chartHeight - padding.bottom} ${equityCurve
                    .map(
                      (point, index) =>
                        `${getXPosition(index)},${getYPosition(point.equity - point.drawdown)}`
                    )
                    .join(" ")} ${chartWidth - padding.right},${chartHeight - padding.bottom}`}
                  fill={isLight ? "rgba(239, 68, 68, 0.1)" : "rgba(239, 68, 68, 0.2)"}
                />
              )}

              {/* Drawdown line */}
              {showDrawdown && (
                <polyline
                  points={equityCurve
                    .map(
                      (point, index) =>
                        `${getXPosition(index)},${getYPosition(point.equity - point.drawdown)}`
                    )
                    .join(" ")}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
              )}

              {/* Equity curve */}
              <polyline
                points={equityCurve
                  .map(
                    (point, index) =>
                      `${getXPosition(index)},${getYPosition(point.equity)}`
                  )
                  .join(" ")}
                fill="none"
                stroke="#10b981"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Interactive points (invisible but clickable) */}
              {equityCurve.map((point, index) => (
                <circle
                  key={`point-${index}`}
                  cx={getXPosition(index)}
                  cy={getYPosition(point.equity)}
                  r="4"
                  fill="transparent"
                  className="cursor-crosshair"
                />
              ))}

              {/* Peak Equity Marker */}
              {finalPeakIndex >= 0 && (
                <g>
                  <circle
                    cx={getXPosition(finalPeakIndex)}
                    cy={getYPosition(equityCurve[finalPeakIndex].equity)}
                    r="6"
                    fill="#10b981"
                    stroke={isLight ? "#ffffff" : "#1e293b"}
                    strokeWidth="2"
                  />
                  <text
                    x={getXPosition(finalPeakIndex)}
                    y={getYPosition(equityCurve[finalPeakIndex].equity) - 15}
                    textAnchor="middle"
                    className={clsx("text-xs font-semibold", isLight ? "fill-slate-900" : "fill-emerald-300")}
                  >
                    Peak
                  </text>
                </g>
              )}

              {/* Max Drawdown Marker */}
              {maxDrawdownIndex >= 0 && (
                <g>
                  <circle
                    cx={getXPosition(maxDrawdownIndex)}
                    cy={getYPosition(equityCurve[maxDrawdownIndex].equity)}
                    r="6"
                    fill="#ef4444"
                    stroke={isLight ? "#ffffff" : "#1e293b"}
                    strokeWidth="2"
                  />
                  <text
                    x={getXPosition(maxDrawdownIndex)}
                    y={getYPosition(equityCurve[maxDrawdownIndex].equity) + 25}
                    textAnchor="middle"
                    className={clsx("text-xs font-semibold", isLight ? "fill-slate-900" : "fill-rose-300")}
                  >
                    Max DD
                  </text>
                </g>
              )}

              {/* Tooltip */}
              {hoveredPoint && (
                <g>
                  {/* Vertical line */}
                  <line
                    x1={hoveredPoint.x}
                    y1={padding.top}
                    x2={hoveredPoint.x}
                    y2={chartHeight - padding.bottom}
                    stroke={isLight ? "#94a3b8" : "#64748b"}
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                  {/* Tooltip point */}
                  <circle
                    cx={hoveredPoint.x}
                    cy={hoveredPoint.y}
                    r="5"
                    fill="#10b981"
                    stroke={isLight ? "#ffffff" : "#1e293b"}
                    strokeWidth="2"
                  />
                  {/* Tooltip box */}
                  <rect
                    x={hoveredPoint.x + 10}
                    y={hoveredPoint.y - 50}
                    width="180"
                    height="80"
                    fill={isLight ? "rgba(255, 255, 255, 0.95)" : "rgba(15, 23, 42, 0.95)"}
                    stroke={isLight ? "#cbd5e1" : "#475569"}
                    strokeWidth="1"
                    rx="4"
                    className="backdrop-blur-sm"
                  />
                  {/* Tooltip text */}
                  <text
                    x={hoveredPoint.x + 20}
                    y={hoveredPoint.y - 30}
                    className={clsx("text-xs font-semibold", isLight ? "fill-slate-900" : "fill-white")}
                  >
                    {format(new Date(hoveredPoint.point.date), "MMM d, yyyy")}
                  </text>
                  <text
                    x={hoveredPoint.x + 20}
                    y={hoveredPoint.y - 15}
                    className={clsx("text-xs", isLight ? "fill-slate-700" : "fill-slate-300")}
                  >
                    Equity: ${hoveredPoint.point.equity.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </text>
                  <text
                    x={hoveredPoint.x + 20}
                    y={hoveredPoint.y}
                    className={clsx("text-xs", isLight ? "fill-slate-700" : "fill-slate-300")}
                  >
                    P&L: {hoveredPoint.point.netPnl >= 0 ? "+" : ""}
                    ${hoveredPoint.point.netPnl.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </text>
                  {showDrawdown && (
                    <text
                      x={hoveredPoint.x + 20}
                      y={hoveredPoint.y + 15}
                      className={clsx("text-xs", isLight ? "fill-rose-600" : "fill-rose-400")}
                    >
                      DD: ${hoveredPoint.point.drawdown.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </text>
                  )}
                </g>
              )}
            </svg>
          </div>
        </div>
      )}

      {!loading && !error && equityCurve.length === 0 && (
        <p className={clsx("text-sm text-center py-8", isLight ? "text-slate-500" : "text-slate-400")}>
          No data available for the selected date range.
        </p>
      )}
    </div>
  );
}

