import { prisma } from "@/lib/prisma";
import { parseMt5Workbook } from "@/lib/mt5";
import { readFileSync } from "node:fs";
import path from "node:path";

async function main() {
  const buffer = readFileSync(path.resolve("..", "Full-Raport.xlsx"));
  const trades = parseMt5Workbook(buffer);
  console.log("parsed trades", trades.length);
  const deduped = dedupeTrades(trades);
  const existing = await prisma.trade.findMany({
    where: { ticket: { in: deduped.map((trade) => trade.ticket) } },
    select: { ticket: true },
  });
  const existingSet = new Set(existing.map((t) => t.ticket));
  const newTrades = deduped.filter((trade) => !existingSet.has(trade.ticket));
  if (newTrades.length === 0) {
    console.log("No new trades to insert.");
    return;
  }
  const result = await prisma.trade.createMany({ data: newTrades });
  console.log("inserted", result.count);
}

function dedupeTrades<T extends { ticket: string }>(trades: T[]): T[] {
  const map = new Map<string, T>();
  for (const trade of trades) {
    if (!map.has(trade.ticket)) {
      map.set(trade.ticket, trade);
    }
  }
  return Array.from(map.values());
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
