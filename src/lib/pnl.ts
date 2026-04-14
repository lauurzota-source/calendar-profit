import { Trade } from "@prisma/client";
import { formatISO } from "./dates";
import { AggregationMode, DailyPnl, MonthlyPnl, TradeIdeaSummary, TradeWithNet, DateMode } from "./types";
import { buildIdeaGroupKey } from "./idea-groups";

export function getNetPnl(trade: Trade) {
  if (typeof trade.netPnl === "number" && !Number.isNaN(trade.netPnl)) {
    return trade.netPnl;
  }
  return trade.profit + trade.commission + trade.swap;
}

export function aggregateDailyPnl(trades: Trade[], mode: AggregationMode, dateMode: DateMode = "open"): DailyPnl[] {
  const map = new Map<string, { pnl: number; trades: number; ideas: Set<string> }>();

  for (const trade of trades) {
    const dateToUse = dateMode === "open" ? trade.openTime : trade.closeTime;
    const key = formatISO(new Date(dateToUse));
    const entry = map.get(key) ?? { pnl: 0, trades: 0, ideas: new Set<string>() };
    const net = getNetPnl(trade);
    entry.pnl += net;
    entry.trades += 1;
    if (mode === "ideas") {
      entry.ideas.add(resolveIdeaKey(trade));
    }
    map.set(key, entry);
  }

  return Array.from(map.entries())
    .map(([date, value]) => ({
      date,
      dailyPnl: Number(value.pnl.toFixed(2)),
      itemCount: mode === "ideas" ? value.ideas.size : value.trades,
    }))
    .sort((a, b) => (a.date > b.date ? 1 : -1));
}

export function aggregateMonthlyPnl(trades: Trade[], mode: AggregationMode, dateMode: DateMode = "open"): MonthlyPnl[] {
  const map = new Map<string, { pnl: number; trades: number; ideas: Set<string> }>();

  for (const trade of trades) {
    const dateToUse = dateMode === "open" ? trade.openTime : trade.closeTime;
    const date = new Date(dateToUse);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const entry = map.get(key) ?? { pnl: 0, trades: 0, ideas: new Set<string>() };
    const net = getNetPnl(trade);
    entry.pnl += net;
    entry.trades += 1;
    if (mode === "ideas") {
      entry.ideas.add(resolveIdeaKey(trade));
    }
    map.set(key, entry);
  }

  return Array.from(map.entries())
    .map(([month, value]) => ({
      month,
      monthlyPnl: Number(value.pnl.toFixed(2)),
      itemCount: mode === "ideas" ? value.ideas.size : value.trades,
    }))
    .sort((a, b) => (a.month > b.month ? 1 : -1));
}
export function attachNetPnl(trade: Trade): TradeWithNet {
  return { ...trade, netPnl: getNetPnl(trade) };
}

export function groupIdeas(trades: Trade[]): TradeIdeaSummary[] {
  const ideaMap = new Map<
    string,
    {
      symbol: string;
      type: string;
      totalVolume: number;
      netPnl: number;
      openTime: Date;
      closeTime: Date;
      legs: TradeWithNet[];
    }
  >();

  for (const trade of trades) {
    const ideaKey = resolveIdeaKey(trade);
    const net = getNetPnl(trade);
    const leg: TradeWithNet = { ...trade, netPnl: net };
    const existing = ideaMap.get(ideaKey);
    if (!existing) {
      ideaMap.set(ideaKey, {
        symbol: trade.symbol,
        type: trade.type,
        totalVolume: trade.volume,
        netPnl: net,
        openTime: new Date(trade.openTime),
        closeTime: new Date(trade.closeTime),
        legs: [leg],
      });
    } else {
      existing.totalVolume += trade.volume;
      existing.netPnl += net;
      if (new Date(trade.openTime) < existing.openTime) existing.openTime = new Date(trade.openTime);
      if (new Date(trade.closeTime) > existing.closeTime) existing.closeTime = new Date(trade.closeTime);
      existing.legs.push(leg);
    }
  }

  return Array.from(ideaMap.entries())
    .map(([ideaGroupKey, data]) => ({
      ideaGroupKey,
      symbol: data.symbol,
      type: data.type,
      totalVolume: Number(data.totalVolume.toFixed(2)),
      netPnl: Number(data.netPnl.toFixed(2)),
      openTime: data.openTime.toISOString(),
      closeTime: data.closeTime.toISOString(),
      legs: data.legs.sort((a, b) => new Date(a.closeTime).getTime() - new Date(b.closeTime).getTime()),
    }))
    .sort((a, b) => (a.closeTime > b.closeTime ? 1 : -1));
}

function resolveIdeaKey(trade: Trade) {
  if (trade.ideaGroupKey && trade.ideaGroupKey.length > 0) {
    return trade.ideaGroupKey;
  }
  return buildIdeaGroupKey(trade.symbol, trade.type, new Date(trade.closeTime));
}
