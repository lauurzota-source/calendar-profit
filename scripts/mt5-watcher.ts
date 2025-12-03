#!/usr/bin/env node

/**
 * MT5 File Watcher - Auto-uploads MT5 reports to Railway app
 * 
 * Usage:
 *   npm run mt5:watch
 * 
 * Or with PM2:
 *   pm2 start scripts/mt5-watcher.ts --interpreter tsx --name mt5-watcher
 */

import { watch, readFileSync, existsSync } from 'fs';
import { join, basename } from 'path';
import FormData from 'form-data';
import fetch from 'node-fetch';

// Configuration
// Set custom folder via environment variable: MT5_REPORTS_PATH
// Or it will use default: ~/Documents/MT5-Reports
const DEFAULT_REPORTS_FOLDER = `${process.env.HOME}/Documents/MT5-Reports`;
const CUSTOM_REPORTS_PATH = process.env.MT5_REPORTS_PATH;

const MT5_EXPORT_PATHS = [
  // Custom folder (highest priority)
  CUSTOM_REPORTS_PATH,
  // Default custom folder in Documents
  DEFAULT_REPORTS_FOLDER,
  // Common MT5 export locations on Mac (fallback)
  `${process.env.HOME}/Documents/MetaTrader 5/Reports`,
  `${process.env.HOME}/Library/Application Support/MetaQuotes/Terminal/*/MQL5/Files`,
].filter(Boolean) as string[];

const API_URL = process.env.MT5_API_URL || 'https://your-app-name.up.railway.app/api/upload';
const WATCH_DELAY = 2000; // Wait 2 seconds after file appears before uploading

const processedFiles = new Set<string>();

function findMT5ReportsFolder(): string | null {
  // First, try to find existing folder
  for (const path of MT5_EXPORT_PATHS) {
    if (!path) continue;
    // Handle wildcards
    const expandedPath = path.replace('*', '');
    if (existsSync(expandedPath)) {
      return expandedPath;
    }
  }
  
  // If custom path is set but doesn't exist, create it
  if (CUSTOM_REPORTS_PATH && !existsSync(CUSTOM_REPORTS_PATH)) {
    const { mkdirSync } = require('fs');
    try {
      mkdirSync(CUSTOM_REPORTS_PATH, { recursive: true });
      console.log(`📁 Created folder: ${CUSTOM_REPORTS_PATH}`);
      return CUSTOM_REPORTS_PATH;
    } catch (error) {
      console.error(`❌ Failed to create folder: ${CUSTOM_REPORTS_PATH}`, error);
    }
  }
  
  // If default folder doesn't exist, create it
  if (!existsSync(DEFAULT_REPORTS_FOLDER)) {
    const { mkdirSync } = require('fs');
    try {
      mkdirSync(DEFAULT_REPORTS_FOLDER, { recursive: true });
      console.log(`📁 Created default folder: ${DEFAULT_REPORTS_FOLDER}`);
      return DEFAULT_REPORTS_FOLDER;
    } catch (error) {
      console.error(`❌ Failed to create default folder: ${DEFAULT_REPORTS_FOLDER}`, error);
    }
  }
  
  return null;
}

async function uploadFile(filePath: string): Promise<void> {
  if (processedFiles.has(filePath)) {
    console.log(`⏭️  Skipping already processed: ${basename(filePath)}`);
    return;
  }

  try {
    console.log(`📤 Uploading: ${basename(filePath)}`);
    
    const fileBuffer = readFileSync(filePath);
    const formData = new FormData();
    
    formData.append('file', fileBuffer, {
      filename: basename(filePath),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const response = await fetch(API_URL, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const result = await response.json() as { imported?: number; message?: string; error?: string };
    
    if (result.error) {
      console.error(`❌ Error: ${result.error}`);
    } else {
      processedFiles.add(filePath);
      console.log(`✅ Successfully imported ${result.imported || 0} trades from ${basename(filePath)}`);
    }
  } catch (error) {
    console.error(`❌ Failed to upload ${basename(filePath)}:`, error);
  }
}

function startWatching(watchPath: string): void {
  console.log(`👀 Watching for new MT5 reports in: ${watchPath}`);
  console.log(`🌐 Sending to: ${API_URL}`);
  console.log(`\nPress Ctrl+C to stop\n`);

  watch(watchPath, { recursive: false }, (eventType, filename) => {
    if (!filename) return;

    const filePath = join(watchPath, filename);
    const isExcelFile = filename.endsWith('.xlsx') || filename.endsWith('.xls');

    if (eventType === 'rename' && isExcelFile) {
      // Wait a bit for file to be fully written
      setTimeout(() => {
        if (existsSync(filePath)) {
          uploadFile(filePath);
        }
      }, WATCH_DELAY);
    }
  });
}

// Main
const reportsPath = findMT5ReportsFolder();

if (!reportsPath) {
  console.error('❌ Could not find or create MT5 Reports folder.');
  console.log('\nOptions:');
  console.log('1. Set custom folder via environment variable:');
  console.log('   export MT5_REPORTS_PATH="/path/to/your/custom/folder"');
  console.log('\n2. Default folder will be created at:');
  console.log(`   ${DEFAULT_REPORTS_FOLDER}`);
  console.log('\n3. Configure MT5 to export reports to this folder:');
  console.log('   Tools → Options → Expert Advisors → Data Folder');
  process.exit(1);
}

console.log(`📂 Using reports folder: ${reportsPath}`);
console.log(`💡 Tip: Configure MT5 to export reports to this folder`);
startWatching(reportsPath);

// Keep process alive
process.on('SIGINT', () => {
  console.log('\n👋 Stopping watcher...');
  process.exit(0);
});

