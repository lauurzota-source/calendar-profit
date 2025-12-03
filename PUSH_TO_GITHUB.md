# Push to GitHub - Quick Steps

## Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `pnl-calendar` (or any name you prefer)
3. Choose Public or Private
4. **Don't** check "Initialize with README"
5. Click "Create repository"

## Step 2: Connect and Push

After creating the repo, GitHub will show you commands. Run these:

```bash
cd /Users/failioads/calendar-profit/pnl-calendar

# Replace YOUR_USERNAME and YOUR_REPO_NAME with your actual values
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

## Step 3: Verify

Check that your code is on GitHub:
- Go to https://github.com/YOUR_USERNAME/YOUR_REPO_NAME
- You should see all your files

## Next: Deploy on Railway

Once your code is on GitHub:
1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository
5. Railway will auto-detect Next.js and deploy!

