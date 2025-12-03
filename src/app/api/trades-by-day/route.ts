import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dayBounds } from "@/lib/dates";
import { attachNetPnl, groupIdeas } from "@/lib/pnl";
import { AggregationMode, DateMode } from "@/lib/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");
  const modeParam = searchParams.get("mode");
  const dateModeParam = searchParams.get("dateMode");
  const mode: AggregationMode = modeParam === "ideas" ? "ideas" : "trades";
  const dateMode: DateMode = dateModeParam === "close" ? "close" : "open";

  if (!dateParam) {
    return NextResponse.json({ error: "date query param is required" }, { status: 400 });
  }

  const date = new Date(dateParam);
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const { start, end } = dayBounds(date);

  const timeField = dateMode === "open" ? "openTime" : "closeTime";

  const trades = await prisma.trade.findMany({
    where: {
      [timeField]: {
        gte: start,
        lte: end,
      },
    },
    orderBy: { [timeField]: "asc" },
  });

  if (mode === "ideas") {
    return NextResponse.json({
      mode,
      dateMode,
      data: groupIdeas(trades),
    });
  }

  return NextResponse.json({
    mode,
    dateMode,
    data: trades.map((trade) => attachNetPnl(trade)),
  });
}
