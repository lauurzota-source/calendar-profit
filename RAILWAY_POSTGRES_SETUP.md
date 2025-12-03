# Railway PostgreSQL Setup Guide

## Problem: SQLite Data Loss
SQLite files on Railway are **ephemeral** - they get wiped when:
- Container restarts
- App redeploys (every GitHub push)
- Railway maintenance
- Container recreation

**Solution: Use PostgreSQL** - Railway provides managed PostgreSQL with persistent storage.

---

## Step 1: Add PostgreSQL Service on Railway

1. Go to your Railway project: https://railway.app
2. Click **"+ New"** button
3. Select **"Database"** → **"Add PostgreSQL"**
4. Railway will automatically create a PostgreSQL database

---

## Step 2: Get Database Connection String

1. Click on the **PostgreSQL** service you just created
2. Go to **"Variables"** tab
3. You'll see `DATABASE_URL` - this is your connection string
4. Copy it (it looks like: `postgresql://user:password@host:port/database`)

---

## Step 3: Connect Your App to PostgreSQL

1. Go back to your **main app service** (not the database)
2. Go to **"Variables"** tab
3. Find or add `DATABASE_URL`
4. **Replace** the value with the PostgreSQL connection string from Step 2
5. Click **"Save"**

**Important:** The app service should use the PostgreSQL `DATABASE_URL`, not `file:./prisma/dev.db`

---

## Step 4: Redeploy Your App

Railway will automatically:
1. Detect the new `DATABASE_URL`
2. Run `prisma migrate deploy` at startup
3. Create tables in PostgreSQL
4. Your data will now persist! 🎉

---

## Step 5: Verify It Works

1. Upload a test report via the app
2. Check that trades appear in the calendar
3. Wait a few minutes, refresh - data should still be there!

---

## Migration Notes

- Old SQLite data is lost (this is expected)
- New data will persist permanently
- You can re-upload your MT5 reports to populate the new database

---

## Troubleshooting

### "Connection refused" error:
- Make sure PostgreSQL service is running
- Check that `DATABASE_URL` is correctly set in app service

### "Table does not exist" error:
- Railway should run migrations automatically
- If not, check build logs for migration errors
- You can manually run: `npx prisma migrate deploy` (but Railway should do this)

### Still losing data:
- Make sure you're using the PostgreSQL `DATABASE_URL`, not SQLite
- Check that PostgreSQL service is not being deleted/recreated

---

## Benefits of PostgreSQL

✅ **Persistent storage** - Data survives redeploys  
✅ **Automatic backups** - Railway handles this  
✅ **Better performance** - For larger datasets  
✅ **Production-ready** - Industry standard  
✅ **Free tier available** - Railway provides free PostgreSQL


