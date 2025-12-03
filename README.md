# P&L Calendar

A Next.js (App Router + TypeScript) web app for visualizing MetaTrader 5 (MT5) trading performance on a monthly heatmap calendar. Upload an MT5 statement (.xls or .xlsx) and review daily P&L, trade counts, and per-trade details in a dark theme UI.

## Tech Stack
- Next.js 16 (App Router, TypeScript)
- Tailwind CSS v4 (via `@tailwindcss/postcss`)
- Prisma ORM + SQLite
- `xlsx` for parsing MT5 exports

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment variables**
   ```bash
   cp .env.example .env
   ```
   Update `DATABASE_URL` if you prefer a different SQLite file path.

3. **Database setup**
   ```bash
   npx prisma migrate dev
   ```

4. **Seed sample trades (optional)**
   ```bash
   npm run seed
   ```
   This wipes existing trades and inserts 45 dummy records so you can explore the calendar immediately.

5. **(Optional) Backfill idea keys after schema updates**
   ```bash
   npm run backfill:ideas
   ```
   Populates `netPnl` and idea grouping keys for any existing trades (safe to run multiple times).

6. **Start the dev server**
   ```bash
   npm run dev
   ```
   Visit [http://localhost:3000](http://localhost:3000) to view the calendar.

## Uploading MT5 Reports
1. Export your MT5 history (Statement) as `.xls` or `.xlsx`.
2. Open [http://localhost:3000/upload](http://localhost:3000/upload).
3. Choose the file and click **Upload report**.
4. The app parses trades, saves them via Prisma, and deduplicates by MT5 ticket.
5. Return to the calendar (`/`) to see the imported data. Use the month/year controls and the **Trades ↔ Trade ideas** toggle to switch counting modes.

## API Endpoints
- `POST /api/upload` — accepts a `file` FormData field, parses MT5 data, inserts trades.
- `GET /api/daily-pnl?from=YYYY-MM-DD&to=YYYY-MM-DD` — returns grouped daily net P&L (`profit + commission + swap`).
- `GET /api/trades-by-day?date=YYYY-MM-DD` — lists individual trades (sorted by `closeTime`) with net P&L per trade.

## Project Scripts
| Command | Description |
| --- | --- |
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Serve built app |
| `npm run lint` | Run ESLint |
| `npm run seed` | Seed SQLite with dummy trades |
| `npm run backfill:ideas` | Populate net P&L + idea keys for legacy rows |
| `npx prisma migrate dev` | Create/apply migrations |
| `npx prisma studio` | (Optional) Inspect DB via Prisma Studio |

## Notes
- The calendar groups trades by close date, displays net P&L with a red/green heatmap, and opens a detail panel with per-trade breakdowns on click.
- Uploading the same MT5 file repeatedly is safe—trades are deduplicated by `ticket`.
- No authentication is implemented in v1; everything runs against a single SQLite database.
- Use the header toggle to switch between dark and light modes; your choice is remembered locally.
