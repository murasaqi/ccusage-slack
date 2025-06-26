const fs = require('fs');
const path = require('path');
const readline = require('readline');
const generatorFactory = require('./lib/generator-factory');

// ANSI color codes for terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m'
};

// カテゴリ定義
const categories = [
  { id: 'tech', name: 'Tech系', weight: 20 },
  { id: 'gadget', name: 'Gadget系', weight: 20 },
  { id: 'food', name: 'Food系', weight: 20 },
  { id: 'entertainment', name: 'Entertainment系', weight: 20 },
  { id: 'life', name: 'Life系', weight: 20 }
];

// レアリティ定義
const rarities = [
  { id: 'N', name: 'Normal', weight: 60, stars: '☆', color: colors.white },
  { id: 'R', name: 'Rare', weight: 25, stars: '⭐️⭐️', color: colors.cyan },
  { id: 'SR', name: 'Super Rare', weight: 10, stars: '⭐️⭐️⭐️', color: colors.yellow },
  { id: 'UR', name: 'Ultra Rare', weight: 4, stars: '⭐️⭐️⭐️⭐️', color: colors.magenta },
  { id: 'LR', name: 'Legend Rare', weight: 1, stars: '⭐️⭐️⭐️⭐️⭐️', color: colors.red }
];

// ユーティリティ関数
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function clear() {
  process.stdout.write('\x1Bc');
}

function getStringWidth(str) {
  // 絵文字や日本語文字の幅を考慮
  return str.split('').reduce((width, char) => {
    const code = char.charCodeAt(0);
    // 絵文字や日本語は2文字分としてカウント
    if (code > 0x1F000 || (code >= 0x3000 && code <= 0x9FFF)) {
      return width + 2;
    }
    return width + 1;
  }, 0);
}

function printCenter(text, width = 60) {
  const textWidth = getStringWidth(text);
  const padding = Math.max(0, Math.floor((width - textWidth) / 2));
  console.log(' '.repeat(padding) + text);
}

function printBox(content, width = 60) {
  console.log('┌' + '─'.repeat(width - 2) + '┐');
  if (Array.isArray(content)) {
    content.forEach(line => {
      const lineWidth = getStringWidth(line);
      const paddingTotal = width - 4 - lineWidth;
      const paddingLeft = Math.floor(paddingTotal / 2);
      const paddingRight = paddingTotal - paddingLeft;
      console.log('│ ' + ' '.repeat(paddingLeft) + line + ' '.repeat(paddingRight) + ' │');
    });
  } else {
    const lineWidth = getStringWidth(content);
    const paddingTotal = width - 4 - lineWidth;
    const paddingLeft = Math.floor(paddingTotal / 2);
    const paddingRight = paddingTotal - paddingLeft;
    console.log('│ ' + ' '.repeat(paddingLeft) + content + ' '.repeat(paddingRight) + ' │');
  }
  console.log('└' + '─'.repeat(width - 2) + '┘');
}

// 重み付き抽選
function weightedRandom(items) {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const item of items) {
    random -= item.weight;
    if (random <= 0) {
      return item;
    }
  }
  
  return items[items.length - 1];
}

// ガチャ演出
async function showGachaAnimation() {
  clear();
  console.log('\n');
  printBox([
    '🎰 MESSAGE.JSON ガチャ 🎰',
    '',
    'ガチャガチャを回します！'
  ]);
  console.log('\n');
  
  // コイン投入
  await sleep(500);
  console.log('    💰');
  await sleep(500);
  console.log('     ↓');
  await sleep(500);
  console.log('    [===]');
  await sleep(500);
  printCenter(`${colors.yellow}チャリーン♪${colors.reset}`);
  await sleep(1000);
  
  // ハンドル回転
  console.log('\n');
  printCenter('ハンドルを回します！');
  console.log('\n');
  
  // ガチャマシンのアスキーアート
  console.log('         ╭─────────╮');
  console.log('         │ ● ● ● │');
  console.log('         │ GACHA! │');
  console.log('         │ ● ● ● │');
  console.log('         ├─────────┤');
  console.log('         │  ╭─╮   │');
  console.log('         │  │○│   │← ハンドル');
  console.log('         │  ╰─╯   │');
  console.log('         ╰─────────╯');
  await sleep(1000);
  
  // ハンドル回転の演出
  const handles = ['＼', '｜', '／', '─'];
  for (let i = 0; i < 8; i++) {
    console.log('\n');
    printCenter(`${colors.yellow}ガチャ ${handles[i % 4]} ガチャ ${handles[(i + 1) % 4]} ガチャ${colors.reset}`);
    await sleep(400);
  }
  
  await sleep(500);
  console.log('\n');
  printCenter('カプセルが落ちてきます...');
  await sleep(1000);
  
  // カプセル落下
  console.log('\n');
  console.log('         ╭─────────╮');
  console.log('         │ ● ● ● │');
  console.log('         │ GACHA! │');
  console.log('         │ ● ● ● │');
  console.log('         ├─────────┤');
  console.log('         │   ○     │');
  await sleep(500);
  console.log('         │    ↓    │');
  await sleep(500);
  console.log('         │         │');
  console.log('         ╰────●────╯');
  await sleep(500);
  
  console.log('\n');
  printCenter(`${colors.green}コロコロ...${colors.reset}`);
  await sleep(800);
  
  console.log('\n');
  printCenter('📦 カプセルGET！');
  await sleep(1000);
}

// レアリティ演出
async function showRarityAnimation(rarity) {
  console.log('\n');
  printCenter('カプセルを開けます...');
  await sleep(1000);
  
  console.log('\n');
  
  // カプセルオープンのアスキーアート
  console.log('        📦');
  await sleep(500);
  console.log('       ／ ＼');
  await sleep(500);
  console.log('      💥💥💥');
  await sleep(800);
  
  console.log('\n');
  
  // レアリティ別の演出
  if (rarity.id === 'N') {
    console.log('\n');
    printCenter(`${colors.white}☆ NORMAL ☆${colors.reset}`);
    console.log('\n');
    printCenter('普通のガチャ結果です');
    
  } else if (rarity.id === 'R') {
    console.log('\n');
    printCenter(`${colors.cyan}⭐️⭐️ RARE GET! ⭐️⭐️${colors.reset}`);
    console.log('\n');
    console.log(`${colors.cyan}     ∧_∧`);
    console.log('     ( ･ω･)');
    console.log('     (  つ◯ ← レア！');
    console.log(`     ｜  ｜${colors.reset}`);
    console.log('\n');
    
  } else if (rarity.id === 'SR') {
    console.log('\n');
    printCenter(`${colors.yellow}⭐️⭐️⭐️ SUPER RARE! ⭐️⭐️⭐️${colors.reset}`);
    console.log('\n');
    
    // キラキラ演出
    for (let i = 0; i < 3; i++) {
      if (i > 0) {
        await sleep(300);
        console.log('\n');
      }
      printCenter(`${colors.yellow}✨ ｷﾗｷﾗｷﾗ ✨${colors.reset}`);
    }
    
    console.log('\n');
    console.log(`${colors.yellow}     ∧_∧`);
    console.log('     (*･ω･)');
    console.log('     (  つ◎ ← スーパーレア！');
    console.log(`     ｜  ｜${colors.reset}`);
    
  } else if (rarity.id === 'UR') {
    console.log('\n');
    
    // 虹色テキストをシンプルに
    console.log(colors.magenta);
    printCenter('◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆');
    console.log(colors.yellow);
    printCenter('⭐️⭐️⭐️⭐️ ULTRA RARE!! ⭐️⭐️⭐️⭐️');
    console.log(colors.cyan);
    printCenter('◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆');
    console.log(colors.reset);
    
    console.log('\n');
    printCenter('🎊 大当たり！ 🎊');
    console.log('\n');
    
    console.log('     ∧_∧');
    console.log('    (｡･ω･｡)');
    console.log('    (  つ💎 ← ウルトラレア！！');
    console.log('    ｜  ｜');
    console.log('    Ｕ￣Ｕ');
    
  } else if (rarity.id === 'LR') {
    console.log('\n');
    
    // 伝説級の大演出
    console.log(colors.red);
    printCenter('！！！！！！！！！！！！！！！');
    printCenter('⚡ LEGEND RARE!!! ⚡');
    printCenter('！！！！！！！！！！！！！！！');
    console.log(colors.reset);
    
    await sleep(500);
    
    console.log('\n');
    printCenter('🌟⭐️⭐️⭐️⭐️⭐️ 伝説級！！！ ⭐️⭐️⭐️⭐️⭐️🌟');
    console.log('\n');
    
    console.log(colors.red);
    console.log('     ∧_∧');
    console.log('    (◎o◎)！');
    console.log('    (  つ👑 ← レジェンド！！！');
    console.log('    ｜  ｜');
    console.log('    Ｕ￣Ｕ');
    console.log(colors.reset);
    
    console.log('\n');
    printCenter('🎆 超大当たり！！！ 🎆');
    console.log('\n');
    
    // ファンファーレ
    for (let i = 0; i < 3; i++) {
      if (i > 0) await sleep(300);
      printCenter('🎺 ﾌｧﾝﾌｧｰﾚ♪ 🎺');
    }
  }
  
  await sleep(1500);
}

// コレクション管理
function loadCollection() {
  const collectionPath = path.join(__dirname, '../../data/collection.json');
  if (fs.existsSync(collectionPath)) {
    return JSON.parse(fs.readFileSync(collectionPath, 'utf8'));
  }
  return {
    obtained: [],
    stats: {
      totalGacha: 0,
      byRarity: { N: 0, R: 0, SR: 0, UR: 0, LR: 0 },
      byCategory: { tech: 0, gadget: 0, food: 0, entertainment: 0, life: 0 }
    }
  };
}

function saveCollection(collection) {
  const collectionPath = path.join(__dirname, '../../data/collection.json');
  fs.writeFileSync(collectionPath, JSON.stringify(collection, null, 2));
}

function updateCollection(collection, category, rarity, fileName) {
  collection.stats.totalGacha++;
  collection.stats.byRarity[rarity.id]++;
  collection.stats.byCategory[category.id]++;
  
  const item = {
    id: String(collection.obtained.length + 1).padStart(3, '0'),
    name: `${category.name} - ${getThemeName(category, rarity)}`,
    rarity: rarity.id,
    category: category.id,
    obtainedAt: new Date().toISOString(),
    fileName: fileName
  };
  
  collection.obtained.push(item);
  return item;
}

// テーマ名生成（仮実装）
function getThemeName(category, rarity) {
  const themes = {
    tech: {
      N: '基本的な開発ツール',
      R: '最新AI開発ツール編',
      SR: 'エンジニア爆笑ツール集',
      UR: '幻の開発環境',
      LR: '伝説のデバッグツール'
    },
    gadget: {
      N: '定番ガジェット',
      R: '最新Apple製品',
      SR: 'レトロガジェット復活',
      UR: '未来のデバイス',
      LR: '幻のプロトタイプ'
    },
    food: {
      N: 'コンビニ飯',
      R: 'ご当地グルメ',
      SR: '高級レストラン',
      UR: 'ミシュラン三つ星',
      LR: '世界一高い食事'
    },
    entertainment: {
      N: '定番サブスク',
      R: 'マニアックな趣味',
      SR: 'VIPエンタメ体験',
      UR: 'プレミアムイベント',
      LR: '一生に一度の体験'
    },
    life: {
      N: '日常の出費',
      R: 'ちょっと贅沢',
      SR: 'プチセレブ生活',
      UR: 'ラグジュアリー',
      LR: '億万長者の日常'
    }
  };
  
  return themes[category.id][rarity.id] || 'スペシャルエディション';
}

// AIでコンテンツを生成
async function generateContent(category, rarity) {
  console.log('\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n');
  
  printCenter('🎲 抽選完了！ 🎲');
  console.log('\n');
  
  console.log(`    カテゴリ: ${category.name}`);
  console.log(`    レアリティ: ${rarity.stars} ${rarity.name}`);
  console.log(`    テーマ: ${getThemeName(category, rarity)}`);
  
  console.log('\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  console.log('\n');
  const config = generatorFactory.getConfig();
  printCenter(`🤖 ${config.generator === 'claude' ? 'Claude' : config.generator === 'gemini' ? 'Gemini' : 'AI'}が内容を生成中...`);
  console.log('\n');
  
  // 生成中の演出
  const dots = ['   ', '.  ', '.. ', '...'];
  let dotIndex = 0;
  let animationInterval;
  
  const startAnimation = () => {
    process.stdout.write('\r');
    printCenter(`考え中${dots[dotIndex % 4]}`);
    dotIndex++;
  };
  
  // アニメーション開始
  startAnimation();
  animationInterval = setInterval(startAnimation, 500);
  
  try {
    // ジェネレーターを取得して生成
    const generator = generatorFactory.create();
    const messageData = await generator.generate(category, rarity);
    
    // アニメーション停止
    clearInterval(animationInterval);
    console.log('\n');
    printCenter(`${colors.green}✅ 生成完了！${colors.reset}`);
    await sleep(500);
    
    return messageData;
    
  } catch (error) {
    // アニメーション停止
    clearInterval(animationInterval);
    console.log('\n');
    
    // エラーハンドリング
    console.error(`${colors.red}❌ 生成エラー: ${error.message}${colors.reset}`);
    
    
    throw error;
  }
}

// 結果保存
function saveResult(category, rarity, messageData) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const fileName = `${category.id}_${rarity.id}_${timestamp}.json`;
  const filePath = path.join(__dirname, '../../messages/gacha-results', fileName);
  
  // gacha-resultsディレクトリがなければ作成
  const resultsDir = path.join(__dirname, '../../messages/gacha-results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  
  fs.writeFileSync(filePath, JSON.stringify(messageData, null, 2));
  
  return fileName;
}

// メインのガチャ機能
async function runGacha() {
  try {
    // ガチャ演出
    await showGachaAnimation();
    
    // カテゴリとレアリティを抽選
    const category = weightedRandom(categories);
    const rarity = weightedRandom(rarities);
    
    // AIでコンテンツを生成
    const messageData = await generateContent(category, rarity);
    
    // レアリティ演出
    await showRarityAnimation(rarity);
    
    // 結果保存
    const fileName = saveResult(category, rarity, messageData);
    
    // コレクション更新
    const collection = loadCollection();
    const item = updateCollection(collection, category, rarity, fileName);
    saveCollection(collection);
    
    // 結果表示
    console.log('\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n');
    
    printCenter('🎉 ガチャ結果 🎉');
    console.log('\n');
    
    console.log(`    カテゴリ: ${category.name}`);
    console.log(`    レアリティ: ${rarity.stars} ${rarity.name}`);
    console.log(`    テーマ: ${getThemeName(category, rarity)}`);
    console.log('\n');
    console.log(`    コレクションNo.${item.id} としてゲット！`);
    
    console.log('\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n');
    
    printCenter(`${colors.green}💾 ファイルを保存しました${colors.reset}`);
    console.log(`    📁 messages/gacha-results/${fileName}`);
    console.log('\n');
    
    return true;
  } catch (error) {
    console.error(`\n${colors.red}❌ エラー: ${error.message}${colors.reset}`);
    return false;
  }
}

// コレクション表示
function showCollection() {
  const collection = loadCollection();
  
  clear();
  console.log('\n');
  
  printBox([
    '📚 あなたのコレクション 📚',
    '',
    `総ガチャ回数: ${collection.stats.totalGacha}回`
  ]);
  
  console.log('\n');
  
  // カテゴリ別進捗
  printCenter(`${colors.cyan}【カテゴリ別収集状況】${colors.reset}`);
  console.log('\n');
  
  const categoryBox = [];
  for (const category of categories) {
    const count = collection.stats.byCategory[category.id] || 0;
    const progress = '■'.repeat(Math.min(count, 5)) + '□'.repeat(Math.max(0, 5 - count));
    categoryBox.push(`${category.name}: ${progress} (${count}/5)`);
  }
  printBox(categoryBox);
  
  console.log('\n');
  
  // レアリティ別統計
  printCenter(`${colors.cyan}【レアリティ別統計】${colors.reset}`);
  console.log('\n');
  
  const rarityBox = [];
  for (const rarity of rarities) {
    const count = collection.stats.byRarity[rarity.id] || 0;
    rarityBox.push(`${rarity.stars} ${rarity.name}: ${count}個`);
  }
  printBox(rarityBox);
  
  console.log('\n');
  
  // 最近の獲得
  if (collection.obtained.length > 0) {
    printCenter(`${colors.cyan}【最近の獲得 TOP5】${colors.reset}`);
    console.log('\n');
    
    const recent = collection.obtained.slice(-5).reverse();
    const recentBox = [];
    recent.forEach(item => {
      const rarity = rarities.find(r => r.id === item.rarity);
      recentBox.push(`No.${item.id} [${item.rarity}] ${item.name}`);
    });
    printBox(recentBox);
  } else {
    printBox([
      'まだガチャを回していません',
      '',
      'さあ、最初のガチャを回しましょう！'
    ]);
  }
}

// ファイル適用機能（Slack設定を更新）
function applyToMessages(fileName) {
  // gacha-results/を含むパスから、ファイル名部分だけを抽出
  const baseName = path.basename(fileName, '.json');
  const messageFile = fileName.includes('/') ? fileName.replace('.json', '') : `gacha-results/${baseName}`;
  
  // 実際のファイルが存在するか確認
  const fullPath = path.join(__dirname, '../../messages/', messageFile + '.json');
  if (!fs.existsSync(fullPath)) {
    console.error(`${colors.red}❌ ファイルが見つかりません: ${fullPath}${colors.reset}`);
    return false;
  }
  
  try {
    // Slack設定を更新
    const slackConfigPath = path.join(__dirname, '../../config/slack.json');
    const slackConfig = JSON.parse(fs.readFileSync(slackConfigPath, 'utf8'));
    slackConfig.messageFile = messageFile;
    fs.writeFileSync(slackConfigPath, JSON.stringify(slackConfig, null, 2));
    
    console.log(`${colors.green}✅ Slackメッセージを ${messageFile} に切り替えました！${colors.reset}`);
    console.log(`${colors.cyan}💡 Slack Updaterを再起動すると新しいメッセージが適用されます${colors.reset}`);
    return true;
  } catch (error) {
    console.error(`${colors.red}❌ エラー: ${error.message}${colors.reset}`);
    return false;
  }
}

// メインメニュー
async function showMainMenu() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));
  
  while (true) {
    clear();
    console.log('\n');
    
    printBox([
      '🎯 MESSAGE.JSON ガチャ 🎯',
      '',
      '    ╭─────╮',
      '    │[ﾟ∀ﾟ]│',
      '    ╰─────╯',
      '  ｶﾞﾁｬｶﾞﾁｬ!',
      '',
      '━━━━━━━━━━━━━━━━',
      '',
      '[ENTER] ガチャを回す',
      '[C]     コレクション確認', 
      '[Q]     終了'
    ]);
    
    console.log('\n');
    const input = await question(`${colors.cyan}選択してください: ${colors.reset}`);
    
    if (input.toLowerCase() === 'q') {
      clear();
      console.log('\n');
      printBox([
        '👋 またね！ 👋',
        '',
        'ガチャのご利用',
        'ありがとうございました！'
      ]);
      console.log('\n');
      rl.close();
      break;
    } else if (input.toLowerCase() === 'c') {
      showCollection();
      console.log('\n');
      await question(`${colors.cyan}[ENTER] メニューに戻る${colors.reset}`);
    } else if (input === '') {
      const success = await runGacha();
      if (success) {
        console.log('\n');
        printBox([
          '🎰 ガチャ完了！ 🎰',
          '',
          'もう一回挑戦しますか？'
        ]);
        console.log('\n');
        const again = await question(`${colors.cyan}もう一回？ [Y/n]: ${colors.reset}`);
        if (again.toLowerCase() === 'n') {
          clear();
          console.log('\n');
          printBox([
            '👋 またね！ 👋',
            '',
            'ガチャのご利用',
            'ありがとうございました！'
          ]);
          console.log('\n');
          rl.close();
          break;
        }
      } else {
        await question(`${colors.cyan}[ENTER] メニューに戻る${colors.reset}`);
      }
    }
  }
}

// メイン処理
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length > 0) {
    if (args[0] === '--apply' && args[1]) {
      applyToMessages(args[1]);
    } else if (args[0] === 'collection') {
      showCollection();
    } else {
      console.log('使い方:');
      console.log('  node cli.js              - ガチャを開始');
      console.log('  node cli.js collection   - コレクション確認');
      console.log('  node cli.js --apply <ファイル名> - 結果をSlackメッセージに設定');
    }
  } else {
    await showMainMenu();
  }
}

// 実行
main().catch(console.error);