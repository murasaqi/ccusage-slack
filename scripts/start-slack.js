#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const messagesDir = path.join(__dirname, '../messages');
const slackConfigPath = path.join(__dirname, '../config/slack.json');

// 色付け用のANSIコード
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m'
};

// メッセージファイル一覧を取得（message-manager.jsから移植）
function getMessageFiles() {
  const files = [];
  
  // デフォルトファイル
  if (fs.existsSync(path.join(messagesDir, 'default.json'))) {
    files.push({ name: 'default', path: 'default.json', type: 'default' });
  }
  
  // ガチャ結果
  const gachaDir = path.join(messagesDir, 'gacha-results');
  if (fs.existsSync(gachaDir)) {
    const gachaFiles = fs.readdirSync(gachaDir)
      .filter(f => f.endsWith('.json'))
      .map(f => ({
        name: `gacha-results/${f.replace('.json', '')}`,
        path: `gacha-results/${f}`,
        type: 'gacha'
      }));
    files.push(...gachaFiles);
  }
  
  // カスタムファイル
  const customDir = path.join(messagesDir, 'custom');
  if (fs.existsSync(customDir)) {
    const customFiles = fs.readdirSync(customDir)
      .filter(f => f.endsWith('.json'))
      .map(f => ({
        name: `custom/${f.replace('.json', '')}`,
        path: `custom/${f}`,
        type: 'custom'
      }));
    files.push(...customFiles);
  }
  
  return files;
}

// メッセージ選択のプロンプト
async function selectMessage() {
  const files = getMessageFiles();
  const config = JSON.parse(fs.readFileSync(slackConfigPath, 'utf8'));
  
  console.log(`${colors.cyan}╔══════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║   Claude Usage Slack Profile Updater     ║${colors.reset}`);
  console.log(`${colors.cyan}╚══════════════════════════════════════════╝${colors.reset}\n`);
  
  console.log(`${colors.yellow}利用可能なメッセージファイル:${colors.reset}\n`);
  
  files.forEach((file, index) => {
    const isCurrent = file.name === config.messageFile;
    const prefix = isCurrent ? '✅ ' : '   ';
    const typeLabel = file.type === 'default' ? '[初期設定]' : 
                      file.type === 'gacha' ? '[ガチャ結果]' : 
                      '[カスタム]';
    
    console.log(`${prefix}${colors.cyan}[${index + 1}]${colors.reset} ${file.name} ${colors.yellow}${typeLabel}${colors.reset}`);
  });
  
  console.log(`\n${colors.magenta}[0]${colors.reset} 現在の設定のまま開始（${colors.green}${config.messageFile}${colors.reset}）`);
  console.log(`${colors.red}[q]${colors.reset} 終了`);
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(`\n${colors.cyan}選択してください [0-${files.length}]: ${colors.reset}`, (answer) => {
      rl.close();
      
      if (answer.toLowerCase() === 'q') {
        console.log(`${colors.yellow}終了します${colors.reset}`);
        process.exit(0);
      }
      
      const choice = parseInt(answer);
      
      if (choice === 0 || isNaN(choice)) {
        console.log(`\n${colors.green}✅ 現在の設定で開始します: ${config.messageFile}${colors.reset}`);
        resolve();
      } else if (choice > 0 && choice <= files.length) {
        const selectedFile = files[choice - 1];
        
        // 設定を更新
        config.messageFile = selectedFile.name;
        fs.writeFileSync(slackConfigPath, JSON.stringify(config, null, 2));
        
        console.log(`\n${colors.green}✅ メッセージファイルを切り替えました: ${selectedFile.name}${colors.reset}`);
        resolve();
      } else {
        console.log(`${colors.red}無効な選択です。現在の設定で開始します。${colors.reset}`);
        resolve();
      }
    });
  });
}

// メイン処理
async function main() {
  try {
    // メッセージ選択
    await selectMessage();
    
    console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.green}🚀 Slack Profile Updaterを開始します...${colors.reset}`);
    console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
    
    // Slack Updaterを起動
    require('../src/slack/index.js');
  } catch (error) {
    console.error(`${colors.red}エラーが発生しました: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// 起動
main();