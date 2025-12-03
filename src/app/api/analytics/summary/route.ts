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

    if (trades.length === 0) {
      return NextResponse.json({
        totalNetPnl: 0,
        avgDailyPnl: 0,
        winRate: 0,
        maxDrawdown: 0,
        riskRewardRatio: 0,
        avgWinPnl: 0,
        avgLossPnl: 0,
        avgWinHoldTime: 0,
        avgLossHoldTime: 0,
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        totalDays: 0,
      });
    }

    let totalNetPnl = 0;
    let totalWinPnl = 0;
    let totalLossPnl = 0;
    let winningTrades = 0;
    let losingTrades = 0;
    let totalWinHoldTime = 0;
    let totalLossHoldTime = 0;
    let peakEquity = 0;
    let maxDrawdown = 0;
    let runningEquity = 0;
    let totalRisk = 0;
    let totalReward = 0;

    const winPnlValues: number[] = [];
    const lossPnlValues: number[] = [];

    for (const trade of trades) {
      const netPnl = getNetPnl(trade);
      totalNetPnl += netPnl;
      runningEquity += netPnl;
      peakEquity = Math.max(peakEquity, runningEquity);
      const drawdown = peakEquity - runningEquity;
      maxDrawdown = Math.max(maxDrawdown, drawdown);

      const holdTime = (new Date(trade.closeTime).getTime() - new Date(trade.openTime).getTime()) / (1000 * 60 * 60); // hours

      if (netPnl > 0) {
        winningTrades++;
        totalWinPnl += netPnl;
        totalWinHoldTime += holdTime;
        winPnlValues.push(netPnl);
        totalReward += Math.abs(netPnl);
      } else if (netPnl < 0) {
        losingTrades++;
        totalLossPnl += netPnl;
        totalLossHoldTime += holdTime;
        lossPnlValues.push(Math.abs(netPnl));
        totalRisk += Math.abs(netPnl);
      }
    }

    const totalTrades = trades.length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const avgDailyPnl = totalNetPnl; // Simplified - could calculate actual days
    const avgWinPnl = winningTrades > 0 ? totalWinPnl / winningTrades : 0;
    const avgLossPnl = losingTrades > 0 ? totalLossPnl / losingTrades : 0;
    const avgWinHoldTime = winningTrades > 0 ? totalWinHoldTime / winningTrades : 0;
    const avgLossHoldTime = losingTrades > 0 ? totalLossHoldTime / losingTrades : 0;
    const riskRewardRatio = totalRisk > 0 ? totalReward / totalRisk : 0;

    // Calculate unique trading days
    const uniqueDays = new Set(trades.map((t) => new Date(t.closeTime).toDateString())).size;
    const dailyAvgPnl = uniqueDays > 0 ? totalNetPnl / uniqueDays : 0;

    return NextResponse.json({
      totalNetPnl: Number(totalNetPnl.toFixed(2)),
      avgDailyPnl: Number(dailyAvgPnl.toFixed(2)),
      winRate: Number(winRate.toFixed(2)),
      maxDrawdown: Number(maxDrawdown.toFixed(2)),
      maxDrawdownPercent: peakEquity > 0 ? Number(((maxDrawdown / peakEquity) * 100).toFixed(2)) : 0,
      riskRewardRatio: Number(riskRewardRatio.toFixed(2)),
      avgWinPnl: Number(avgWinPnl.toFixed(2)),
      avgLossPnl: Number(Math.abs(avgLossPnl).toFixed(2)),
      avgWinHoldTime: Number(avgWinHoldTime.toFixed(2)),
      avgLossHoldTime: Number(avgLossHoldTime.toFixed(2)),
      totalTrades,
      winningTrades,
      losingTrades,
      totalDays: uniqueDays,
    });
  } catch (error) {
    console.error("[analytics] Failed to calculate summary", error);
    return NextResponse.json({ error: "Failed to calculate summary" }, { status: 500 });
  }
}

