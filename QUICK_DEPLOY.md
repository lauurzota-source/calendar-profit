# Quick Deploy Guide 🚀

## Fastest Way: Railway (5 minutes)

Railway supports SQLite and is easiest for quick deployment:

1. **Sign up**: Go to https://railway.app and sign up with GitHub
2. **Create Project**: Click "New Project" → "Deploy from GitHub repo"
3. **Select Repo**: Choose your `calendar-profit` repository
4. **Auto-deploy**: Railway detects Next.js and deploys automatically
5. **Get URL**: Your app will be live at `https://your-app.railway.app`

**Done!** Your app is live with a dummy domain.

---

## Alternative: Vercel + PostgreSQL (Better for production)

### Step 1: Get Free PostgreSQL Database

**Supabase** (Recommended):
1. Go to https://supabase.com → Sign up
2. Create new project
3. Go to Settings → Database
4. Copy connection string: `postgresql://postgres:[YOUR-PASSWORD]@[HOST]:5432/postgres`

### Step 2: Update Database

Run this command to switch to PostgreSQL:
```bash
cd /Users/failioads/calendar-profit/pnl-calendar
# Update schema.prisma to use postgresql instead of sqlite
```

### Step 3: Push to GitHub

```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### Step 4: Deploy on Vercel

1. Go to https://vercel.com → Sign up with GitHub
2. Click "Add New Project"
3. Import your repository
4. Set Root Directory: `pnl-calendar`
5. Add Environment Variable:
   - Key: `DATABASE_URL`
   - Value: Your Supabase connection string
6. Click "Deploy"

**Done!** Your app is live at `https://your-app.vercel.app`

---

## Need Help?

- Railway: https://docs.railway.app
- Vercel: https://vercel.com/docs
- Supabase: https://supabase.com/docs

