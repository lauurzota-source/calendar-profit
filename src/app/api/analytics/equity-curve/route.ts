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

    let runningEquity = 0;
    let peakEquity = 0;
    let maxDrawdown = 0;

    const equityCurve = trades.map((trade) => {
      const netPnl = getNetPnl(trade);
      runningEquity += netPnl;
      peakEquity = Math.max(peakEquity, runningEquity);
      const drawdown = peakEquity - runningEquity;
      maxDrawdown = Math.max(maxDrawdown, drawdown);

      return {
        date: trade.closeTime.toISOString(),
        equity: Number(runningEquity.toFixed(2)),
        drawdown: Number(drawdown.toFixed(2)),
        netPnl: Number(netPnl.toFixed(2)),
      };
    });

    return NextResponse.json({
      equityCurve,
      peakEquity: Number(peakEquity.toFixed(2)),
      maxDrawdown: Number(maxDrawdown.toFixed(2)),
      finalEquity: equityCurve.length > 0 ? equityCurve[equityCurve.length - 1].equity : 0,
    });
  } catch (error) {
    console.error("[analytics] Failed to calculate equity curve", error);
    return NextResponse.json({ error: "Failed to calculate equity curve" }, { status: 500 });
  }
}

