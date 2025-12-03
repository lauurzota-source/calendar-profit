import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getNetPnl } from "@/lib/pnl";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    const from = fromParam ? new Date(fromParam) : new Date(0);
    const to = toParam ? new Date(toParam) : new Date();

    const trades = await prisma.trade.findMany({
      where: {
        closeTime: {
          gte: from,
          lte: to,
        },
      },
      orderBy: { closeTime: "asc" },
    });

    // Win/Loss by Weekday
    const weekdayStats: Record<string, { wins: number; losses: number; breakeven: number; totalPnl: number }> = {};
    const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    // Win/Loss by Hour
    const hourStats: Record<number, { wins: number; losses: number; breakeven: number; totalPnl: number }> = {};

    // Win/Loss by Pair
    const pairStats: Record<string, { wins: number; losses: number; breakeven: number; totalPnl: number }> = {};

    // Win/Loss by Direction
    const directionStats: Record<string, { wins: number; losses: number; breakeven: number; totalPnl: number }> = {};

    // Win/Loss by Trade Idea
    const ideaStats: Record<string, { wins: number; losses: number; breakeven: number; totalPnl: number }> = {};

    for (const trade of trades) {
      const netPnl = getNetPnl(trade);
      const closeDate = new Date(trade.closeTime);
      const weekday = weekdayNames[closeDate.getDay()];
      const hour = closeDate.getHours();
      const symbol = trade.symbol;
      const type = trade.type;
      const ideaKey = trade.ideaGroupKey || `${symbol}-${type}-${closeDate.getTime()}`;

      // Determine win/loss/breakeven
      let category: "wins" | "losses" | "breakeven";
      if (netPnl > 0) category = "wins";
      else if (netPnl < 0) category = "losses";
      else category = "breakeven";

      // Update weekday stats
      if (!weekdayStats[weekday]) {
        weekdayStats[weekday] = { wins: 0, losses: 0, breakeven: 0, totalPnl: 0 };
      }
      weekdayStats[weekday][category]++;
      weekdayStats[weekday].totalPnl += netPnl;

      // Update hour stats
      if (!hourStats[hour]) {
        hourStats[hour] = { wins: 0, losses: 0, breakeven: 0, totalPnl: 0 };
      }
      hourStats[hour][category]++;
      hourStats[hour].totalPnl += netPnl;

      // Update pair stats
      if (!pairStats[symbol]) {
        pairStats[symbol] = { wins: 0, losses: 0, breakeven: 0, totalPnl: 0 };
      }
      pairStats[symbol][category]++;
      pairStats[symbol].totalPnl += netPnl;

      // Update direction stats
      if (!directionStats[type]) {
        directionStats[type] = { wins: 0, losses: 0, breakeven: 0, totalPnl: 0 };
      }
      directionStats[type][category]++;
      directionStats[type].totalPnl += netPnl;

      // Update idea stats
      if (!ideaStats[ideaKey]) {
        ideaStats[ideaKey] = { wins: 0, losses: 0, breakeven: 0, totalPnl: 0 };
      }
      ideaStats[ideaKey][category]++;
      ideaStats[ideaKey].totalPnl += netPnl;
    }

    // Calculate win rates
    const calculateWinRate = (stats: { wins: number; losses: number; breakeven: number }) => {
      const total = stats.wins + stats.losses + stats.breakeven;
      if (total === 0) return 0;
      return Number(((stats.wins / (stats.wins + stats.losses)) * 100).toFixed(2));
    };

    const weekdayResults = weekdayNames.map((day) => {
      const stats = weekdayStats[day] || { wins: 0, losses: 0, breakeven: 0, totalPnl: 0 };
      return {
        category: day,
        ...stats,
        winRate: calculateWinRate(stats),
        totalTrades: stats.wins + stats.losses + stats.breakeven,
      };
    });

    const hourResults = Array.from({ length: 24 }, (_, hour) => {
      const stats = hourStats[hour] || { wins: 0, losses: 0, breakeven: 0, totalPnl: 0 };
      return {
        category: hour,
        ...stats,
        winRate: calculateWinRate(stats),
        totalTrades: stats.wins + stats.losses + stats.breakeven,
      };
    });

    const pairResults = Object.entries(pairStats).map(([symbol, stats]) => ({
      category: symbol,
      ...stats,
      winRate: calculateWinRate(stats),
      totalTrades: stats.wins + stats.losses + stats.breakeven,
    }));

    const directionResults = Object.entries(directionStats).map(([type, stats]) => ({
      category: type,
      ...stats,
      winRate: calculateWinRate(stats),
      totalTrades: stats.wins + stats.losses + stats.breakeven,
    }));

    return NextResponse.json({
      weekday: weekdayResults,
      hour: hourResults,
      pair: pairResults,
      direction: directionResults,
    });
  } catch (error) {
    console.error("[analytics] Failed to calculate win/loss patterns", error);
    return NextResponse.json({ error: "Failed to calculate win/loss patterns" }, { status: 500 });
  }
}

