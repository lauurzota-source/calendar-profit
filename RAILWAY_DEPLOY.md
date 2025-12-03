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

### 4. Set Environment Variables
- Go to **Variables** tab
- Add this variable:
  - **Key**: `DATABASE_URL`
  - **Value**: `file:./prisma/dev.db` (for SQLite, Railway supports it)
  - Click **"Add"**

### 5. Wait for Deployment
- Railway will automatically:
  - Install dependencies
  - Build your Next.js app
  - Deploy it

### 6. Get Your Live URL
- Once deployed, go to **Settings** tab
- Under **"Domains"**, you'll see your live URL
- It will be something like: `https://your-app-name.up.railway.app`

### 7. (Optional) Custom Domain
- In the **Domains** section, you can add a custom domain
- Or use the provided Railway domain

## That's it! 🎉

Your app is now live and accessible from anywhere!

## Troubleshooting

If you see errors:
1. Check **Deployments** tab for build logs
2. Make sure **Root Directory** is set to `pnl-calendar`
3. Verify `DATABASE_URL` environment variable is set

