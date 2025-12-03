"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";

interface Insight {
  type: "warning" | "success" | "info";
  title: string;
  description: string;
  recommendation: string;
}

interface PerformanceInsightsProps {
  dateRange: { from: string; to: string };
  theme: "dark" | "light";
}

export function PerformanceInsights({ dateRange, theme }: PerformanceInsightsProps) {
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<Insight[]>([]);

  const isLight = theme === "light";
  const surfaceClass = isLight
    ? "rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
    : "rounded-lg border border-slate-700/50 bg-slate-900/50 p-6 shadow-sm";

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch win/loss patterns to generate insights
        const response = await fetch(
          `/api/analytics/win-loss-patterns?from=${dateRange.from}&to=${dateRange.to}`
        );
        if (!response.ok) throw new Error("Failed to load data");
        const data = await response.json();

        const newInsights: Insight[] = [];

        // Analyze worst day of week
        const worstDay = data.weekday
          .filter((d: any) => d.totalTrades > 0)
          .sort((a: any, b: any) => a.totalPnl - b.totalPnl)[0];
        if (worstDay && worstDay.totalPnl < -100) {
          newInsights.push({
            type: "warning",
            title: `Worst Day: ${worstDay.category}`,
            description: `You lost $${Math.abs(worstDay.totalPnl).toFixed(2)} on ${worstDay.category}s (${worstDay.winRate.toFixed(1)}% win rate).`,
            recommendation: `Consider avoiding trading on ${worstDay.category}s, or review your ${worstDay.category} trading strategy.`,
          });
        }

        // Analyze best day of week
        const bestDay = data.weekday
          .filter((d: any) => d.totalTrades > 0)
          .sort((a: any, b: any) => b.totalPnl - a.totalPnl)[0];
        if (bestDay && bestDay.totalPnl > 100 && bestDay.winRate > 55) {
          newInsights.push({
            type: "success",
            title: `Best Day: ${bestDay.category}`,
            description: `You made $${bestDay.totalPnl.toFixed(2)} on ${bestDay.category}s with ${bestDay.winRate.toFixed(1)}% win rate.`,
            recommendation: `Consider focusing more on ${bestDay.category} trading sessions.`,
          });
        }

        // Analyze best hour
        const bestHour = data.hour
          .filter((d: any) => d.totalTrades > 3)
          .sort((a: any, b: any) => b.totalPnl - a.totalPnl)[0];
        if (bestHour && bestHour.totalPnl > 50) {
          newInsights.push({
            type: "success",
            title: `Best Hour: ${bestHour.category}:00`,
            description: `Most profitable hour is ${bestHour.category}:00 with $${bestHour.totalPnl.toFixed(2)} profit.`,
            recommendation: `Consider scheduling more trades during ${bestHour.category}:00-${Number(bestHour.category) + 1}:00 timeframe.`,
          });
        }

        // Analyze best pair
        const bestPair = data.pair
          .filter((d: any) => d.totalTrades > 0)
          .sort((a: any, b: any) => b.totalPnl - a.totalPnl)[0];
        if (bestPair && bestPair.totalPnl > 100) {
          const totalPnl = data.pair.reduce((sum: number, p: any) => sum + Math.max(0, p.totalPnl), 0);
          const pairContribution = (bestPair.totalPnl / totalPnl) * 100;
          if (pairContribution > 50) {
            newInsights.push({
              type: "info",
              title: `Best Pair: ${bestPair.category}`,
              description: `${bestPair.category} contributes ${pairContribution.toFixed(0)}% of your total profits.`,
              recommendation: `Consider focusing more on ${bestPair.category} trading.`,
            });
          }
        }

        setInsights(newInsights);
      } catch (err) {
        console.error("Failed to generate insights", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dateRange]);

  const getInsightIcon = (type: Insight["type"]) => {
    switch (type) {
      case "warning":
        return "⚠️";
      case "success":
        return "✅";
      case "info":
        return "ℹ️";
    }
  };

  const getInsightColor = (type: Insight["type"]) => {
    switch (type) {
      case "warning":
        return isLight
          ? "border-rose-200 bg-rose-50 text-rose-900"
          : "border-rose-500/30 bg-rose-500/10 text-rose-300";
      case "success":
        return isLight
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
      case "info":
        return isLight
          ? "border-cyan-200 bg-cyan-50 text-cyan-900"
          : "border-cyan-500/30 bg-cyan-500/10 text-cyan-300";
    }
  };

  return (
    <div className={surfaceClass}>
      <h2 className={clsx("text-lg font-semibold mb-4", isLight ? "text-slate-900" : "text-white")}>
        Performance Insights
      </h2>

      {loading && (
        <p className={clsx("text-sm", isLight ? "text-slate-500" : "text-slate-400")}>Analyzing your performance...</p>
      )}

      {!loading && insights.length === 0 && (
        <p className={clsx("text-sm text-center py-4", isLight ? "text-slate-500" : "text-slate-400")}>
          No insights available for the selected date range.
        </p>
      )}

      {!loading && insights.length > 0 && (
        <div className="space-y-4">
          {insights.map((insight, index) => (
            <div
              key={index}
              className={clsx("rounded-lg border p-4", getInsightColor(insight.type))}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl">{getInsightIcon(insight.type)}</span>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">{insight.title}</h3>
                  <p className="text-sm mb-2 opacity-90">{insight.description}</p>
                  <p className="text-sm font-medium opacity-80">💡 {insight.recommendation}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

