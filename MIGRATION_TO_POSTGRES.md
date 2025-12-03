# Migration from SQLite to PostgreSQL

## What Changed

1. **Prisma Schema**: Updated from `provider = "sqlite"` to `provider = "postgresql"`
2. **Migrations**: Old SQLite migrations removed, new PostgreSQL migration will be created
3. **Database**: Now uses PostgreSQL instead of SQLite

## Important Notes

⚠️ **Data Loss**: Existing SQLite data will be lost when switching to PostgreSQL. This is expected and necessary.

✅ **Solution**: Re-upload your MT5 reports after migration to populate the new PostgreSQL database.

## Local Development

For local development, you can:

1. **Use PostgreSQL locally** (recommended):
   ```bash
   # Install PostgreSQL locally or use Docker
   docker run --name postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres
   
   # Set DATABASE_URL in .env
   DATABASE_URL="postgresql://postgres:password@localhost:5432/pnl_calendar"
   ```

2. **Or use SQLite for local dev, PostgreSQL for production**:
   - Keep two `.env` files: `.env.local` (SQLite) and `.env.production` (PostgreSQL)
   - Railway will use the production PostgreSQL automatically

## Railway Setup

Follow `RAILWAY_POSTGRES_SETUP.md` for detailed Railway setup instructions.

## After Migration

1. Add PostgreSQL service on Railway
2. Set `DATABASE_URL` in app service to PostgreSQL connection string
3. Redeploy app
4. Re-upload your MT5 reports

Your data will now persist permanently! 🎉

