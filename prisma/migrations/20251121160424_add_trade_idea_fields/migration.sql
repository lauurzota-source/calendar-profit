-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Trade" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticket" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "volume" REAL NOT NULL,
    "openTime" DATETIME NOT NULL,
    "closeTime" DATETIME NOT NULL,
    "openPrice" REAL NOT NULL DEFAULT 0,
    "closePrice" REAL NOT NULL DEFAULT 0,
    "profit" REAL NOT NULL,
    "commission" REAL NOT NULL,
    "swap" REAL NOT NULL,
    "balanceAfterTrade" REAL,
    "netPnl" REAL NOT NULL DEFAULT 0,
    "ideaGroupKey" TEXT
);
INSERT INTO "new_Trade" ("balanceAfterTrade", "closeTime", "commission", "id", "openTime", "profit", "swap", "symbol", "ticket", "type", "volume") SELECT "balanceAfterTrade", "closeTime", "commission", "id", "openTime", "profit", "swap", "symbol", "ticket", "type", "volume" FROM "Trade";
DROP TABLE "Trade";
ALTER TABLE "new_Trade" RENAME TO "Trade";
CREATE INDEX "Trade_closeTime_idx" ON "Trade"("closeTime");
CREATE INDEX "Trade_ideaGroupKey_idx" ON "Trade"("ideaGroupKey");
CREATE UNIQUE INDEX "Trade_ticket_key" ON "Trade"("ticket");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
