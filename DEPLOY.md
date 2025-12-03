# Deployment Guide

## Option 1: Deploy to Vercel (Recommended)

### Prerequisites
1. GitHub/GitLab/Bitbucket account
2. Vercel account (free at vercel.com)
3. PostgreSQL database (free options: Supabase, Neon, Railway)

### Steps:

#### 1. Set up PostgreSQL Database

**Option A: Supabase (Free)**
1. Go to https://supabase.com
2. Create a new project
3. Go to Settings > Database
4. Copy the connection string (it looks like: `postgresql://postgres:[password]@[host]:5432/postgres`)

**Option B: Neon (Free)**
1. Go to https://neon.tech
2. Create a new project
3. Copy the connection string

#### 2. Update Prisma Schema

Change `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

#### 3. Push Code to GitHub

```bash
cd /Users/failioads/calendar-profit/pnl-calendar
git add .
git commit -m "Prepare for deployment"
git push origin main
```

#### 4. Deploy on Vercel

1. Go to https://vercel.com
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `pnl-calendar`
   - **Build Command**: `prisma generate && prisma migrate deploy && next build`
   - **Install Command**: `npm install`
5. Add Environment Variable:
   - **Name**: `DATABASE_URL`
   - **Value**: Your PostgreSQL connection string
6. Click "Deploy"

#### 5. Run Migrations

After first deployment, you may need to run migrations:
```bash
npx prisma migrate deploy
```

Or set up a postinstall script in package.json.

---

## Option 2: Deploy to Railway (Supports SQLite)

### Steps:

1. Go to https://railway.app
2. Sign up with GitHub
3. Click "New Project" > "Deploy from GitHub repo"
4. Select your repository
5. Add environment variable:
   - `DATABASE_URL` (Railway will auto-create SQLite or you can use PostgreSQL)
6. Railway will auto-detect Next.js and deploy

---

## Option 3: Quick Test with Vercel + SQLite (Limited)

For testing only (data won't persist between deployments):

1. Deploy to Vercel as above
2. Use SQLite with `/tmp` directory (ephemeral)
3. Note: Data will be lost on each deployment

---

## Environment Variables Needed

- `DATABASE_URL`: Your database connection string

## After Deployment

Your app will be available at: `https://your-project-name.vercel.app`

You can also add a custom domain in Vercel settings.

