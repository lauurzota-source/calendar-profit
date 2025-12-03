import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TradeCreateInput } from "@/lib/mt5";

export const runtime = "nodejs";

/**
 * API endpoint to receive live trade data from MT5
 * Can be called by MQL5 EA or other integrations
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Expected format from MQL5 EA:
    // {
    //   symbol: string,
    //   positionId: number,
    //   deals: Array<{ ticket, time, type, entry, volume, price, profit, commission, swap }>
    // }
    
    if (!data.symbol || !data.deals || !Array.isArray(data.deals)) {
      return NextResponse.json(
        { error: "Invalid data format. Expected: { symbol, positionId, deals[] }" },
        { status: 400 }
      );
    }

    // Process deals and create trade records
    const trades: TradeCreateInput[] = [];
    
    // Group deals by position and create trade records
    // This is a simplified version - you may need to adjust based on MT5 deal structure
    const openDeal = data.deals.find((d: any) => d.entry === "0" || d.entry === 0); // DEAL_ENTRY_IN
    const closeDeal = data.deals.find((d: any) => d.entry === "1" || d.entry === 1); // DEAL_ENTRY_OUT
    
    if (openDeal && closeDeal) {
      const totalProfit = data.deals.reduce((sum: number, d: any) => sum + (parseFloat(d.profit) || 0), 0);
      const totalCommission = data.deals.reduce((sum: number, d: any) => sum + (parseFloat(d.commission) || 0), 0);
      const totalSwap = data.deals.reduce((sum: number, d: any) => sum + (parseFloat(d.swap) || 0), 0);
      
      const trade: TradeCreateInput = {
        ticket: String(data.positionId),
        symbol: data.symbol,
        type: openDeal.type === "DEAL_TYPE_BUY" ? "BUY" : "SELL",
        volume: parseFloat(openDeal.volume) || 0,
        openTime: new Date(openDeal.time),
        closeTime: new Date(closeDeal.time),
        openPrice: parseFloat(openDeal.price) || 0,
        closePrice: parseFloat(closeDeal.price) || 0,
        profit: totalProfit,
        commission: totalCommission,
        swap: totalSwap,
        balanceAfterTrade: null,
        netPnl: totalProfit + totalCommission + totalSwap,
        ideaGroupKey: null,
      };
      
      trades.push(trade);
    }

    if (trades.length === 0) {
      return NextResponse.json({ imported: 0, message: "No valid trades found in data" });
    }

    // Check for existing trades
    const existing = await prisma.trade.findMany({
      where: { ticket: { in: trades.map((t) => t.ticket) } },
      select: { ticket: true },
    });

    const existingSet = new Set(existing.map((t) => t.ticket));
    const newTrades = trades.filter((t) => !existingSet.has(t.ticket));

    if (newTrades.length === 0) {
      return NextResponse.json({ imported: 0, message: "All trades already exist" });
    }

    const result = await prisma.trade.createMany({
      data: newTrades,
    });

    return NextResponse.json({ 
      imported: result.count,
      trades: newTrades.map(t => ({ ticket: t.ticket, symbol: t.symbol }))
    });
  } catch (error) {
    console.error("[mt5/sync] Failed to sync trade:", error);
    return NextResponse.json(
      { error: "Failed to sync trade", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

