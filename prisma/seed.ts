import { PrismaClient } from "@prisma/client";
import { addMinutes, subDays } from "date-fns";
import { buildIdeaGroupKey } from "../src/lib/idea-groups";

const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  const symbols = ["EURUSD", "GBPUSD", "NAS100", "XAUUSD", "USDJPY"];
  const types = ["BUY", "SELL"];

  const trades = Array.from({ length: 45 }).map((_, index) => {
    const dayOffset = Math.floor(Math.random() * 24);
    const closeTime = subDays(now, dayOffset);
    closeTime.setHours(Math.floor(Math.random() * 23), Math.floor(Math.random() * 59), 0, 0);
    const openTime = addMinutes(closeTime, -Math.floor(Math.random() * 180));
    const volume = Number((Math.random() * 2 + 0.1).toFixed(2));
    const openPrice = Number((Math.random() * 100 + 1800).toFixed(2));
    const closePrice = Number((openPrice + (Math.random() * 40 - 20)).toFixed(2));
    const net = Number((Math.random() * 1200 - 600).toFixed(2));
    const commission = Number((-Math.random() * 15).toFixed(2));
    const swap = Number((-Math.random() * 10).toFixed(2));
    const profit = Number((net - commission - swap).toFixed(2));
    const ideaGroupKey = buildIdeaGroupKey(symbols[index % symbols.length], types[index % types.length], closeTime);

    return {
      ticket: `SEED-${index + 1}`,
      symbol: symbols[index % symbols.length],
      type: types[index % types.length],
      volume,
      openTime,
      closeTime,
      openPrice,
      closePrice,
      profit,
      commission,
      swap,
      balanceAfterTrade: 10000 + index * 50 + profit,
      netPnl: net,
      ideaGroupKey,
    };
  });

  await prisma.trade.deleteMany();
  await prisma.trade.createMany({ data: trades });
  console.info(`Seeded ${trades.length} trades.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
