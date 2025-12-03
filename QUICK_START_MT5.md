# Quick Start: MT5 Live Integration on Mac M2

## Recommended: File Watcher Method (Easiest)

### Step 1: Set Up Custom Reports Folder

**Option A: Use Setup Script (Easiest)**
```bash
cd /Users/failioads/calendar-profit/pnl-calendar
npm run mt5:setup
```
This will create a custom folder (default: `~/Documents/MT5-Reports`) and configure it.

**Option B: Manual Setup**
```bash
# Create custom folder
mkdir -p ~/Documents/MT5-Reports

# Set environment variable
export MT5_REPORTS_PATH="$HOME/Documents/MT5-Reports"

# Add to your shell profile (permanent)
echo 'export MT5_REPORTS_PATH="$HOME/Documents/MT5-Reports"' >> ~/.zshrc
source ~/.zshrc
```

**Then configure MT5:**
1. Open MT5
2. Go to **Tools → Options → Expert Advisors**
3. Set "Data Folder" to your custom folder (e.g., `~/Documents/MT5-Reports`)
4. Or manually export reports to this folder

### Step 2: Install Dependencies

```bash
cd /Users/failioads/calendar-profit/pnl-calendar
npm install
```

### Step 3: Configure

Set your Railway app URL:

```bash
export MT5_API_URL="https://your-app-name.up.railway.app/api/upload"
```

Or create a `.env.local` file:
```
MT5_API_URL=https://your-app-name.up.railway.app/api/upload
```

### Step 4: Run the Watcher

```bash
npm run mt5:watch
```

The watcher will:
- Monitor your MT5 Reports folder
- Automatically upload new Excel reports
- Show upload status in terminal

### Step 5: Set Up Auto-Start (Optional)

Install PM2 to run in background:

```bash
npm install -g pm2
pm2 start npm --name "mt5-watcher" -- run mt5:watch
pm2 save
pm2 startup  # Follow instructions to auto-start on boot
```

### Step 6: Test It

1. Export a new report from MT5
2. Watch the terminal - you should see:
   ```
   📤 Uploading: Report-2025-12-03.xlsx
   ✅ Successfully imported 15 trades
   ```

---

## Alternative: MQL5 Expert Advisor (Real-time)

If you want true real-time (no file export needed):

1. Copy the MQL5 code from `MT5_INTEGRATION.md`
2. Create `MT5LiveSync.mq5` in MT5's `MQL5/Experts/` folder
3. Compile in MetaEditor
4. Attach to any chart in MT5
5. Configure API URL in EA settings

**Note:** MQL5 EA requires MT5 to be running on Windows (use Parallels/VM on Mac).

---

## Troubleshooting

### Watcher doesn't find reports folder:
```bash
# Set custom path
export MT5_REPORTS_PATH="/path/to/your/mt5/reports"
npm run mt5:watch
```

### Upload fails:
- Check Railway app URL is correct
- Verify app is running (check Railway dashboard)
- Check network connection

### Want to test manually:
```bash
# Upload a file directly
curl -X POST https://your-app.up.railway.app/api/upload \
  -F "file=@/path/to/report.xlsx"
```

