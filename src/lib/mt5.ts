import { read, utils } from "xlsx";
import { parseMt5Date } from "./dates";
import { Trade } from "@prisma/client";
import { buildIdeaGroupKey } from "./idea-groups";

export type TradeCreateInput = Omit<Trade, "id">;

const NUMERIC_FIELDS = ["profit", "commission", "swap", "volume", "balance after trade", "balance", "result", "price", "price_1"] as const;
const HEADER_MARKERS = ["type", "tip"];
const OPEN_PRICE_KEYS = ["price", "open price", "pret", "buy price"];
const CLOSE_PRICE_KEYS = ["price_1", "close price", "pret_1", "sell price"];

export function parseMt5Workbook(buffer: Buffer) {
  const workbook = read(buffer, { type: "buffer", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const structuredRows = utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
    raw: false,
  });

  const fromHeaders = structuredRows
    .map(normalizeRow)
    .map(mapRowToTrade)
    .filter((record): record is TradeCreateInput => Boolean(record));

  if (fromHeaders.length > 0) {
    return fromHeaders;
  }

  const matrix = utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: null,
    raw: false,
  });

  return parseMatrixRows(matrix);
}

function normalizeRow(row: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key.trim().toLowerCase(), normalizeValue(key, value)])
  );
}

function normalizeValue(key: string, value: unknown) {
  if (value == null) return value;
  if (NUMERIC_FIELDS.includes(key.trim().toLowerCase() as (typeof NUMERIC_FIELDS)[number])) {
    return parseNumber(value);
  }
  if (value instanceof Date) return value;
  if (typeof value === "string") return value.trim();
  return value;
}

function mapRowToTrade(row: Record<string, unknown>): TradeCreateInput | null {
  const ticket = getString(row, ["ticket", "deal", "order"]);
  const openTime = parseMt5Date(row["open time"] ?? row["time"] ?? row["open"]);
  const closeTime = parseMt5Date(row["close time"] ?? row["time"] ?? row["close"]);
  const symbol = getString(row, ["symbol", "item", "description"]);
  const type = getString(row, ["type", "action"]);
  const volume = parseNumber(row["volume"] ?? row["size"] ?? row["lots"]);
  const profit = parseNumber(row["profit"] ?? row["result"]);
  const commission = parseNumber(row["commission"]);
  const swap = parseNumber(row["swap"]);
  const balanceAfterTrade = parseNumber(row["balance after trade"] ?? row["balance"]);
  const openPrice = parseNumber(firstAvailable(row, OPEN_PRICE_KEYS));
  const closePrice = parseNumber(firstAvailable(row, CLOSE_PRICE_KEYS));

  if (!ticket || !openTime || !closeTime || !symbol || !type || volume == null || profit == null || commission == null || swap == null) {
    return null;
  }

  return buildTrade({
    ticket,
    symbol,
    type,
    volume,
    openTime,
    closeTime,
    openPrice,
    closePrice,
    profit,
    commission,
    swap,
    balanceAfterTrade,
  });
}

function parseMatrixRows(matrix: (string | number | null)[][]): TradeCreateInput[] {
  const headerIndex = matrix.findIndex((row) =>
    row.some((cell) => typeof cell === "string" && HEADER_MARKERS.includes(cell.trim().toLowerCase()))
  );

  if (headerIndex === -1) {
    return [];
  }

  const dataRows = matrix.slice(headerIndex + 1);
  const trades: TradeCreateInput[] = [];

  for (const row of dataRows) {
    if (!row || row.length < 8) continue;
    const firstCell = row[0];
    if (typeof firstCell === "string") {
      const trimmed = firstCell.trim();
      if (trimmed.length === 0) continue;
      if (/^(depozit|balance|operatii|operations|rezultat|result)/i.test(trimmed)) {
        break;
      }
    }

    const trade = mapMatrixRowToTrade(row);
    if (trade) {
      trades.push(trade);
    }
  }

  return trades;
}

function mapMatrixRowToTrade(row: (string | number | null)[]): TradeCreateInput | null {
  const openTime = parseMt5Date(row[0] ?? null);
  const ticket = getStringFromCell(row[1]);
  const symbol = getStringFromCell(row[2]);
  const type = getStringFromCell(row[3]);
  const volume = parseNumber(row[4]);
  const openPrice = parseNumber(row[5]);
  const closeTime = parseMt5Date(row[8] ?? null);
  const closePrice = parseNumber(row[9]);
  const commission = parseNumber(row[10]);
  const swap = parseNumber(row[11]);
  const profit = parseNumber(row[12]);

  if (!openTime || !closeTime || !ticket || !symbol || !type || volume == null || profit == null || commission == null || swap == null) {
    return null;
  }

  return buildTrade({
    ticket,
    symbol,
    type,
    volume,
    openTime,
    closeTime,
    openPrice,
    closePrice,
    profit,
    commission,
    swap,
    balanceAfterTrade: undefined,
  });
}

function getStringFromCell(value: string | number | null | undefined) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number") {
    return String(value);
  }
  return null;
}

function parseNumber(value: unknown) {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.replace(/[^0-9+\-\.]/g, "");
    const parsed = parseFloat(normalized);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function getString(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function firstAvailable(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (row[key] != null) return row[key];
  }
  return null;
}

function buildTrade(data: {
  ticket: string;
  symbol: string;
  type: string;
  volume: number;
  openTime: Date;
  closeTime: Date;
  openPrice?: number | null;
  closePrice?: number | null;
  profit: number;
  commission: number;
  swap: number;
  balanceAfterTrade?: number | null;
}): TradeCreateInput {
  const openPrice = data.openPrice ?? 0;
  const closePrice = data.closePrice ?? 0;
  const netPnl = Number((data.profit + data.commission + data.swap).toFixed(2));
  return {
    ticket: data.ticket,
    symbol: data.symbol,
    type: data.type,
    volume: data.volume,
    openTime: data.openTime,
    closeTime: data.closeTime,
    openPrice,
    closePrice,
    profit: data.profit,
    commission: data.commission,
    swap: data.swap,
    balanceAfterTrade: data.balanceAfterTrade ?? null,
    netPnl,
    ideaGroupKey: buildIdeaGroupKey(data.symbol, data.type, data.closeTime),
  };
}
