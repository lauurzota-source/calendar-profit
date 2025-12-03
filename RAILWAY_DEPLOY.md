# Deploy to Railway - Step by Step 🚂

## Your code is now on GitHub! ✅
Repository: https://github.com/lauurzota-source/calendar-profit

## Deploy Steps:

### 1. Go to Railway
- Visit: https://railway.app
- Sign in with your GitHub account (if not already)

### 2. Create New Project
- Click **"New Project"** button
- Select **"Deploy from GitHub repo"**
- Authorize Railway to access your GitHub (if first time)
- Find and select: **`lauurzota-source/calendar-profit`**

### 3. Configure Deployment
Railway will auto-detect Next.js, but you need to set:

**Root Directory:**
- Click on your project
- Go to **Settings** tab
- Under **"Root Directory"**, set: `pnl-calendar`
- Click **"Save"**

### 4. Add PostgreSQL Database (IMPORTANT!)
**⚠️ SQLite doesn't persist data on Railway! You MUST use PostgreSQL.**

1. In your Railway project, click **"+ New"** → **"Database"** → **"Add PostgreSQL"**
2. Railway will create a PostgreSQL database automatically
3. Click on the **PostgreSQL service** you just created
4. Go to **"Variables"** tab
5. Copy the `DATABASE_URL` value (looks like: `postgresql://user:pass@host:port/db`)

### 5. Set Environment Variables for Your App
1. Go back to your **main app service** (not the database)
2. Go to **"Variables"** tab
3. Add/Update this variable:
   - **Key**: `DATABASE_URL`
   - **Value**: Paste the PostgreSQL connection string from step 4
   - Click **"Add"** or **"Update"**

**Important:** Use the PostgreSQL `DATABASE_URL`, NOT `file:./prisma/dev.db`

### 6. Wait for Deployment
- Railway will automatically:
  - Install dependencies
  - Build your Next.js app
  - Deploy it

### 7. Get Your Live URL
- Once deployed, go to **Settings** tab
- Under **"Domains"**, you'll see your live URL
- It will be something like: `https://your-app-name.up.railway.app`

### 8. (Optional) Custom Domain
- In the **Domains** section, you can add a custom domain
- Or use the provided Railway domain

## That's it! 🎉

Your app is now live and accessible from anywhere!

## Troubleshooting

If you see errors:
1. Check **Deployments** tab for build logs
2. Make sure **Root Directory** is set to `pnl-calendar`
3. Verify `DATABASE_URL` environment variable is set to PostgreSQL connection string
4. Make sure PostgreSQL service is running (not paused)

**For detailed PostgreSQL setup, see:** `RAILWAY_POSTGRES_SETUP.md`

