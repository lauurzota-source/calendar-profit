import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { aggregateMonthlyPnl } from "@/lib/pnl";
import { AggregationMode, DateMode, MonthlyPnl } from "@/lib/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const yearParam = searchParams.get("year");
  const modeParam = searchParams.get("mode");
  const dateModeParam = searchParams.get("dateMode");
  const mode: AggregationMode = modeParam === "ideas" ? "ideas" : "trades";
  const dateMode: DateMode = dateModeParam === "close" ? "close" : "open";

  if (!yearParam) {
    return NextResponse.json({ error: "year query param is required" }, { status: 400 });
  }

  const year = Number(yearParam);
  if (!Number.isInteger(year) || year < 1970 || year > 9999) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  }

  const from = new Date(year, 0, 1, 0, 0, 0, 0);
  const to = new Date(year, 11, 31, 23, 59, 59, 999);
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

  const monthData = aggregateMonthlyPnl(trades, mode, dateMode);
  const monthMap = new Map(monthData.map((entry) => [entry.month, entry]));
  const fullYear: MonthlyPnl[] = Array.from({ length: 12 }, (_, monthIndex) => {
    const month = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
    const existing = monthMap.get(month);
    return existing ?? { month, monthlyPnl: 0, itemCount: 0 };
  });

  return NextResponse.json({ data: fullYear, mode, dateMode, year });
}
