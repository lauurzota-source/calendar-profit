import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseMt5Workbook, TradeCreateInput } from "@/lib/mt5";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    const extension = file.name?.split(".").pop()?.toLowerCase();
    if (!extension || !["xls", "xlsx"].includes(extension)) {
      return NextResponse.json({ error: "Only .xls or .xlsx files are supported" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const trades = dedupeTrades(parseMt5Workbook(buffer));

    if (trades.length === 0) {
      return NextResponse.json({ error: "No trades found in the uploaded file" }, { status: 400 });
    }

    const existing = await prisma.trade.findMany({
      where: { ticket: { in: trades.map((trade) => trade.ticket) } },
      select: { ticket: true },
    });

    const existingSet = new Set(existing.map((trade) => trade.ticket));
    const newTrades = trades.filter((trade) => !existingSet.has(trade.ticket));

    if (newTrades.length === 0) {
      return NextResponse.json({ imported: 0, message: "All trades already exist." });
    }

    const result = await prisma.trade.createMany({
      data: newTrades,
    });

    return NextResponse.json({ imported: result.count });
  } catch (error) {
    console.error("[upload] Failed to import MT5 report", error);
    return NextResponse.json({ error: "Failed to import MT5 report" }, { status: 500 });
  }
}

function dedupeTrades(trades: TradeCreateInput[]) {
  const map = new Map<string, TradeCreateInput>();
  for (const trade of trades) {
    if (!map.has(trade.ticket)) {
      map.set(trade.ticket, trade);
    }
  }
  return Array.from(map.values());
}
