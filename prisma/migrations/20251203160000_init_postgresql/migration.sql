-- CreateTable
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL,
    "ticket" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "volume" DOUBLE PRECISION NOT NULL,
    "openTime" TIMESTAMP(3) NOT NULL,
    "closeTime" TIMESTAMP(3) NOT NULL,
    "openPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "closePrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "profit" DOUBLE PRECISION NOT NULL,
    "commission" DOUBLE PRECISION NOT NULL,
    "swap" DOUBLE PRECISION NOT NULL,
    "balanceAfterTrade" DOUBLE PRECISION,
    "netPnl" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ideaGroupKey" TEXT,

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Trade_ticket_key" ON "Trade"("ticket");

-- CreateIndex
CREATE INDEX "Trade_closeTime_idx" ON "Trade"("closeTime");

-- CreateIndex
CREATE INDEX "Trade_openTime_idx" ON "Trade"("openTime");

-- CreateIndex
CREATE INDEX "Trade_ideaGroupKey_idx" ON "Trade"("ideaGroupKey");

