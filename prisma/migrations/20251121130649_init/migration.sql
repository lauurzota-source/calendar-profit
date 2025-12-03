-- CreateTable
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticket" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "volume" REAL NOT NULL,
    "openTime" DATETIME NOT NULL,
    "closeTime" DATETIME NOT NULL,
    "profit" REAL NOT NULL,
    "commission" REAL NOT NULL,
    "swap" REAL NOT NULL,
    "balanceAfterTrade" REAL
);

-- CreateIndex
CREATE INDEX "Trade_closeTime_idx" ON "Trade"("closeTime");

-- CreateIndex
CREATE UNIQUE INDEX "Trade_ticket_key" ON "Trade"("ticket");
