#!/usr/bin/env node
const path = require('path');
const fs = require('fs').promises;
const readline = require('readline');
const { GoogleSheetsSync } = require('../src/google');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function setup() {
  console.log('🚀 Google Sheets連携セットアップを開始します\n');

  try {
    // Check if config exists
    const configPath = path.join(__dirname, '../config/google.json');
    let config = {};
    
    try {
      const configData = await fs.readFile(configPath, 'utf8');
      config = JSON.parse(configData);
      console.log('✅ 既存の設定ファイルを読み込みました\n');
    } catch (error) {
      console.log('📝 新規セットアップを開始します\n');
    }

    // Ask for spreadsheet URL
    console.log('Google Spreadsheetsの共有URLを入力してください');
    console.log('例: https://docs.google.com/spreadsheets/d/xxx/edit#gid=0');
    
    let spreadsheetUrl = await question('URL: ');
    spreadsheetUrl = spreadsheetUrl.trim();
    
    if (!spreadsheetUrl) {
      console.log('\n❌ URLが入力されませんでした');
      process.exit(1);
    }

    // Extract spreadsheet ID to validate
    const match = spreadsheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) {
      console.log('\n❌ 無効なSpreadsheet URLです');
      process.exit(1);
    }

    console.log('\n✅ Spreadsheet ID:', match[1]);

    // Ask for display name (optional)
    console.log('\n表示名を入力してください（省略可能、Slackから自動取得）');
    const displayName = await question('表示名: ');

    // Ask for ranking display preference
    console.log('\nSlackステータスにランキングを表示しますか？');
    const showRanking = await question('表示する場合は yes: ');

    // Update configuration
    config.enabled = true;
    config.spreadsheetUrl = spreadsheetUrl;
    config.displayRanking = showRanking.toLowerCase() === 'yes';

    // Save configuration
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    console.log('\n✅ 設定を保存しました');

    // Update .env if display name was provided
    if (displayName.trim()) {
      const envPath = path.join(__dirname, '../.env');
      let envContent = '';
      
      try {
        envContent = await fs.readFile(envPath, 'utf8');
      } catch (error) {
        // .env doesn't exist
      }

      // Update or add DISPLAY_NAME
      const lines = envContent.split('\n');
      const displayNameIndex = lines.findIndex(line => line.startsWith('DISPLAY_NAME='));
      
      if (displayNameIndex >= 0) {
        lines[displayNameIndex] = `DISPLAY_NAME=${displayName.trim()}`;
      } else {
        lines.push(`DISPLAY_NAME=${displayName.trim()}`);
      }

      await fs.writeFile(envPath, lines.join('\n'));
      console.log('✅ 表示名を設定しました');
    }

    // Initialize Google Sheets connection
    console.log('\n🔄 Google認証を開始します...');
    const googleSync = new GoogleSheetsSync();
    
    // Set environment variables
    process.env.GOOGLE_SHEETS_URL = spreadsheetUrl;
    if (displayName.trim()) {
      process.env.DISPLAY_NAME = displayName.trim();
    }

    // Initialize
    const initialized = await googleSync.initialize();
    
    if (initialized) {
      console.log('\n✨ セットアップが完了しました！');
      console.log('\n次のコマンドでSlack連携を開始できます:');
      console.log('  npm start\n');
      
      // Show ranking command if enabled
      if (config.displayRanking) {
        console.log('ランキングを確認するには:');
        console.log('  npm run ranking\n');
      }
    } else {
      console.log('\n❌ セットアップに失敗しました');
    }

  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run setup
setup();