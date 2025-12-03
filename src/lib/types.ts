import { Trade } from "@prisma/client";

export type AggregationMode = "trades" | "ideas";
export type DateMode = "open" | "close";

export type DailyPnl = {
  date: string; // YYYY-MM-DD
  dailyPnl: number;
  itemCount: number;
};

export type TradeWithNet = Trade & { netPnl: number };

export type TradeIdeaSummary = {
  ideaGroupKey: string;
  symbol: string;
  type: string;
  totalVolume: number;
  netPnl: number;
  openTime: string;
  closeTime: string;
  legs: TradeWithNet[];
};
