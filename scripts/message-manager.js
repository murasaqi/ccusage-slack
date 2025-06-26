#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const messagesDir = path.join(__dirname, '../messages');
const slackConfigPath = path.join(__dirname, '../config/slack.json');

// コマンドライン引数を取得
const args = process.argv.slice(2);
const command = args[0];

// 色付け用のANSIコード
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m'
};

// メッセージファイル一覧を取得
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

// 現在の設定を表示
function showCurrent() {
  try {
    const config = JSON.parse(fs.readFileSync(slackConfigPath, 'utf8'));
    console.log(`${colors.cyan}現在のメッセージファイル: ${colors.green}${config.messageFile}${colors.reset}`);
  } catch (e) {
    console.error(`${colors.red}設定ファイルの読み込みに失敗しました${colors.reset}`);
  }
}

// メッセージファイル一覧を表示
function listFiles() {
  const files = getMessageFiles();
  const config = JSON.parse(fs.readFileSync(slackConfigPath, 'utf8'));
  
  console.log(`${colors.cyan}利用可能なメッセージファイル:${colors.reset}\n`);
  
  files.forEach(file => {
    const isCurrent = file.name === config.messageFile;
    const prefix = isCurrent ? '✅ ' : '   ';
    const typeLabel = file.type === 'default' ? '[初期設定]' : 
                      file.type === 'gacha' ? '[ガチャ結果]' : 
                      '[カスタム]';
    
    console.log(`${prefix}${file.name} ${colors.yellow}${typeLabel}${colors.reset}`);
  });
  
  console.log(`\n${colors.cyan}切り替えるには: npm run message:use <ファイル名>${colors.reset}`);
}

// メッセージファイルを切り替え
function useFile(fileName) {
  if (!fileName) {
    console.error(`${colors.red}ファイル名を指定してください${colors.reset}`);
    console.log('使い方: npm run message:use <ファイル名>');
    return;
  }
  
  // .jsonを除去
  fileName = fileName.replace('.json', '');
  
  // ファイルの存在確認
  const fullPath = path.join(messagesDir, fileName + '.json');
  if (!fs.existsSync(fullPath)) {
    console.error(`${colors.red}ファイルが見つかりません: ${fileName}${colors.reset}`);
    console.log('利用可能なファイルを確認するには: npm run message:list');
    return;
  }
  
  try {
    // 設定を更新
    const config = JSON.parse(fs.readFileSync(slackConfigPath, 'utf8'));
    config.messageFile = fileName;
    fs.writeFileSync(slackConfigPath, JSON.stringify(config, null, 2));
    
    console.log(`${colors.green}✅ メッセージファイルを切り替えました: ${fileName}${colors.reset}`);
    console.log(`${colors.yellow}⚠️  Slack Updaterを再起動してください${colors.reset}`);
  } catch (e) {
    console.error(`${colors.red}設定の更新に失敗しました: ${e.message}${colors.reset}`);
  }
}

// ヘルプを表示
function showHelp() {
  console.log('メッセージファイル管理ツール\n');
  console.log('使い方:');
  console.log('  npm run message:list     - 利用可能なメッセージファイル一覧');
  console.log('  npm run message:current  - 現在の設定を表示');
  console.log('  npm run message:use <ファイル名> - メッセージファイルを切り替え');
  console.log('\n例:');
  console.log('  npm run message:use default');
  console.log('  npm run message:use gacha-results/tech_N_2025-06-26');
}

// メイン処理
switch (command) {
  case 'list':
    listFiles();
    break;
  case 'current':
    showCurrent();
    break;
  case 'use':
    useFile(args[1]);
    break;
  case 'help':
  case '--help':
  case '-h':
    showHelp();
    break;
  default:
    showHelp();
}