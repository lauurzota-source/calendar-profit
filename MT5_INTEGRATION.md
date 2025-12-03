# MT5 Live Integration Guide for Mac M2

## Current Setup
Your app currently imports trades via Excel file upload. For live updates, here are the best options:

---

## Option 1: MQL5 Expert Advisor (EA) - **RECOMMENDED** ⭐

### How it works:
- Create an MQL5 Expert Advisor that runs in MT5
- When a trade closes, it automatically sends trade data to your Railway app via HTTP
- Works on any platform (Windows/Mac via Wine/Parallels)

### Steps:

#### 1. Create the MQL5 EA

Create a file: `MT5LiveSync.mq5` in MT5's `MQL5/Experts/` folder:

```mql5
//+------------------------------------------------------------------+
//|                                          MT5LiveSync.mq5         |
//|                        Sends closed trades to your web app       |
//+------------------------------------------------------------------+
#property copyright "Your Name"
#property version   "1.00"
#property strict

input string API_URL = "https://your-app-name.up.railway.app/api/mt5/sync";
input int    CheckInterval = 1; // Check every 1 second
input bool   SendOnTradeClose = true;

datetime lastCheckTime = 0;
ulong lastDealTicket = 0;

//+------------------------------------------------------------------+
void OnTick() {
   if(TimeCurrent() - lastCheckTime < CheckInterval) return;
   lastCheckTime = TimeCurrent();
   
   if(SendOnTradeClose) {
      CheckForNewClosedTrades();
   }
}

//+------------------------------------------------------------------+
void CheckForNewClosedTrades() {
   HistorySelect(0, TimeCurrent());
   
   for(int i = HistoryDealsTotal() - 1; i >= 0; i--) {
      ulong ticket = HistoryDealGetTicket(i);
      if(ticket == 0) continue;
      
      if(ticket <= lastDealTicket) break; // Already processed
      
      ENUM_DEAL_TYPE dealType = (ENUM_DEAL_TYPE)HistoryDealGetInteger(ticket, DEAL_TYPE);
      
      // Only process DEAL_TYPE_BALANCE, DEAL_TYPE_COMMISSION, DEAL_TYPE_CHARGE, DEAL_TYPE_CORRECTION
      // and actual trade closes (DEAL_TYPE_SELL or DEAL_TYPE_BUY that close positions)
      
      if(dealType == DEAL_TYPE_SELL || dealType == DEAL_TYPE_BUY) {
         if(HistoryDealGetInteger(ticket, DEAL_ENTRY) == DEAL_ENTRY_OUT) {
            SendTradeToAPI(ticket);
            lastDealTicket = ticket;
         }
      }
   }
}

//+------------------------------------------------------------------+
void SendTradeToAPI(ulong dealTicket) {
   // Get position info
   string symbol = HistoryDealGetString(dealTicket, DEAL_SYMBOL);
   long positionId = HistoryDealGetInteger(dealTicket, DEAL_POSITION_ID);
   
   // Get all deals for this position
   HistorySelect(0, TimeCurrent());
   string deals = "";
   int dealCount = 0;
   
   for(int i = 0; i < HistoryDealsTotal(); i++) {
      ulong ticket = HistoryDealGetTicket(i);
      if(ticket == 0) continue;
      if(HistoryDealGetInteger(ticket, DEAL_POSITION_ID) != positionId) continue;
      
      if(deals != "") deals += ",";
      deals += "{";
      deals += "\"ticket\":\"" + IntegerToString(ticket) + "\",";
      deals += "\"time\":\"" + TimeToString((datetime)HistoryDealGetInteger(ticket, DEAL_TIME), TIME_DATE|TIME_SECONDS) + "\",";
      deals += "\"type\":\"" + EnumToString((ENUM_DEAL_TYPE)HistoryDealGetInteger(ticket, DEAL_TYPE)) + "\",";
      deals += "\"entry\":\"" + IntegerToString(HistoryDealGetInteger(ticket, DEAL_ENTRY)) + "\",";
      deals += "\"volume\":" + DoubleToString(HistoryDealGetDouble(ticket, DEAL_VOLUME), 2) + ",";
      deals += "\"price\":" + DoubleToString(HistoryDealGetDouble(ticket, DEAL_PRICE), 5) + ",";
      deals += "\"profit\":" + DoubleToString(HistoryDealGetDouble(ticket, DEAL_PROFIT), 2) + ",";
      deals += "\"commission\":" + DoubleToString(HistoryDealGetDouble(ticket, DEAL_COMMISSION), 2) + ",";
      deals += "\"swap\":" + DoubleToString(HistoryDealGetDouble(ticket, DEAL_SWAP), 2);
      deals += "}";
      dealCount++;
   }
   
   // Build JSON
   string json = "{";
   json += "\"symbol\":\"" + symbol + "\",";
   json += "\"positionId\":" + IntegerToString(positionId) + ",";
   json += "\"deals\":[" + deals + "]";
   json += "}";
   
   // Send HTTP POST
   char data[];
   char result[];
   string headers;
   
   StringToCharArray(json, data, 0, StringLen(json));
   headers = "Content-Type: application/json\r\n";
   
   int res = WebRequest("POST", API_URL, headers, 5000, data, result, headers);
   
   if(res == 200) {
      Print("Trade sent successfully: ", symbol, " Position: ", positionId);
   } else {
      Print("Error sending trade: ", res, " ", CharArrayToString(result));
   }
}
```

#### 2. Create API Endpoint in Your App

Create: `src/app/api/mt5/sync/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    // Process and save trade data
    // Similar to upload route but for individual trades
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
```

---

## Option 2: File Watcher Service (Mac Native) 🍎

### How it works:
- MT5 exports reports to a folder
- A local service watches that folder
- When a new file appears, it auto-uploads to your Railway app

### Steps:

#### 1. Create File Watcher Script

Create: `scripts/mt5-watcher.ts`

```typescript
import { watch } from 'fs';
import { readFileSync } from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';
import path from 'path';

const MT5_EXPORT_PATH = '/Users/YOUR_USERNAME/Documents/MetaTrader 5/Reports';
const API_URL = 'https://your-app-name.up.railway.app/api/upload';

const processedFiles = new Set<string>();

watch(MT5_EXPORT_PATH, (eventType, filename) => {
  if (eventType === 'rename' && filename?.endsWith('.xlsx')) {
    const filePath = path.join(MT5_EXPORT_PATH, filename);
    
    if (processedFiles.has(filePath)) return;
    processedFiles.add(filePath);
    
    setTimeout(() => {
      uploadFile(filePath);
    }, 2000); // Wait 2 seconds for file to be fully written
  }
});

async function uploadFile(filePath: string) {
  try {
    const fileBuffer = readFileSync(filePath);
    const formData = new FormData();
    formData.append('file', fileBuffer, {
      filename: path.basename(filePath),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    
    const response = await fetch(API_URL, {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    console.log(`Uploaded ${filePath}:`, result);
  } catch (error) {
    console.error('Upload error:', error);
  }
}

console.log(`Watching ${MT5_EXPORT_PATH} for new MT5 reports...`);
```

#### 2. Run as Background Service

```bash
# Install dependencies
npm install form-data node-fetch @types/node

# Run with PM2 (process manager)
npm install -g pm2
pm2 start scripts/mt5-watcher.ts --interpreter tsx --name mt5-watcher
pm2 save
pm2 startup  # Auto-start on boot
```

---

## Option 3: Python Bridge (Advanced)

### How it works:
- Use MetaTrader5 Python library
- Python script polls MT5 for new trades
- Sends to your app via HTTP

**Note:** MetaTrader5 Python library has limited Mac support. May need Windows VM or Wine.

---

## Recommendation

**For Mac M2, I recommend Option 2 (File Watcher)** because:
- ✅ Native Mac support
- ✅ No MT5 modifications needed
- ✅ Simple to set up
- ✅ Works with existing export workflow

**Option 1 (MQL5 EA)** is best if:
- You can run MT5 on Windows (via Parallels/VM)
- You want true real-time (no file export delay)
- You're comfortable with MQL5

---

## Next Steps

Which option would you like to implement? I can help you:
1. Set up the file watcher service
2. Create the MQL5 EA code
3. Build the API endpoint to receive live trades

