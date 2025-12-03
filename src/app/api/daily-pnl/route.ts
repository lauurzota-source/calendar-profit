import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { aggregateDailyPnl } from "@/lib/pnl";
import { dayBounds } from "@/lib/dates";
import { AggregationMode, DateMode } from "@/lib/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const modeParam = searchParams.get("mode");
  const dateModeParam = searchParams.get("dateMode");
  const mode: AggregationMode = modeParam === "ideas" ? "ideas" : "trades";
  const dateMode: DateMode = dateModeParam === "close" ? "close" : "open";

  if (!fromParam || !toParam) {
    return NextResponse.json({ error: "from and to query params are required" }, { status: 400 });
  }

  const fromDate = new Date(fromParam);
  const toDate = new Date(toParam);

  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }

  const from = dayBounds(fromDate).start;
  const to = dayBounds(toDate).end;

  const timeField = dateMode === "open" ? "openTime" : "closeTime";

  const trades = await prisma.trade.findMany({
    where: {
      [timeField]: {
        gte: from,
        lte: to,
      },
    },
    orderBy: { [timeField]: "asc" },
  });

  return NextResponse.json({ data: aggregateDailyPnl(trades, mode, dateMode), mode, dateMode });
}
