import { prisma } from "@/lib/prisma";
import { buildIdeaGroupKey } from "@/lib/idea-groups";

async function main() {
  const trades = await prisma.trade.findMany();
  for (const trade of trades) {
    const netPnl = Number((trade.profit + trade.commission + trade.swap).toFixed(2));
    const ideaGroupKey =
      trade.ideaGroupKey && trade.ideaGroupKey.length > 0
        ? trade.ideaGroupKey
        : buildIdeaGroupKey(trade.symbol, trade.type, new Date(trade.closeTime));
    await prisma.trade.update({
      where: { id: trade.id },
      data: {
        netPnl,
        ideaGroupKey,
      },
    });
  }
  console.info(`Backfilled ${trades.length} trades.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
