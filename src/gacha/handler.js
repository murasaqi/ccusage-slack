// AI生成版のガチャリクエストハンドラ
// このファイルは、.gacha-request.jsonを監視してAIツールを使用してmessage.jsonの内容を生成します

const fs = require('fs');
const path = require('path');
const generatorFactory = require('./lib/generator-factory');

// カテゴリ定義（gacha.jsと同期）
const categories = [
  { id: 'tech', name: 'Tech系', weight: 20 },
  { id: 'gadget', name: 'Gadget系', weight: 20 },
  { id: 'food', name: 'Food系', weight: 20 },
  { id: 'entertainment', name: 'Entertainment系', weight: 20 },
  { id: 'life', name: 'Life系', weight: 20 }
];

// レアリティ定義（gacha.jsと同期）
const rarities = [
  { id: 'N', name: 'Normal', weight: 60, stars: '☆' },
  { id: 'R', name: 'Rare', weight: 25, stars: '⭐️⭐️' },
  { id: 'SR', name: 'Super Rare', weight: 10, stars: '⭐️⭐️⭐️' },
  { id: 'UR', name: 'Ultra Rare', weight: 4, stars: '⭐️⭐️⭐️⭐️' },
  { id: 'LR', name: 'Legend Rare', weight: 1, stars: '⭐️⭐️⭐️⭐️⭐️' }
];

// リクエストを処理してレスポンスを生成
async function handleGachaRequest() {
  const requestPath = path.join(__dirname, '.gacha-request.json');
  const responsePath = path.join(__dirname, '.gacha-response.json');
  
  // リクエストファイルが存在しない場合は何もしない
  if (!fs.existsSync(requestPath)) {
    return;
  }
  
  try {
    // リクエストを読み込み
    const request = JSON.parse(fs.readFileSync(requestPath, 'utf8'));
    
    // カテゴリとレアリティを取得
    const category = categories.find(c => c.id === request.category);
    const rarity = rarities.find(r => r.id === request.rarity);
    
    if (!category || !rarity) {
      throw new Error(`Invalid category or rarity: ${request.category}, ${request.rarity}`);
    }
    
    console.log(`🎲 Generating ${category.name} ${rarity.name} content...`);
    
    // ジェネレーターを取得
    const generator = generatorFactory.create();
    
    // コンテンツを生成
    const generatedData = await generator.generate(category, rarity);
    
    // レスポンスを書き込み
    fs.writeFileSync(responsePath, JSON.stringify(generatedData, null, 2));
    
    // リクエストファイルを削除
    fs.unlinkSync(requestPath);
    
    console.log(`✅ Generated ${category.name} ${rarity.name} gacha result`);
    
  } catch (error) {
    console.error('❌ Error handling gacha request:', error.message);
    
  }
}

// ジェネレーターのテスト機能
async function testGenerators() {
  console.log('🧪 Testing available generators...\n');
  
  const availableGenerators = generatorFactory.getAvailableGenerators();
  console.log('Available generators:', availableGenerators.join(', '));
  
  const config = generatorFactory.getConfig();
  console.log('Current generator:', config.generator);
  console.log('\nConfiguration:');
  console.log(JSON.stringify(config, null, 2));
  
  // 各ジェネレーターをテスト
  for (const type of availableGenerators) {
    console.log(`\n📝 Testing ${type} generator...`);
    const success = await generatorFactory.testGenerator(type);
    console.log(`${type}: ${success ? '✅ OK' : '❌ Failed'}`);
  }
}

// ファイル監視モード
function watchMode() {
  console.log('👀 Watching for gacha requests...');
  console.log('Current generator:', generatorFactory.getConfig().generator);
  console.log('Press Ctrl+C to stop\n');

  const requestPath = path.join(__dirname, '.gacha-request.json');

  // 初回チェック
  handleGachaRequest();

  // fs.watchでファイルの変更を監視
  fs.watch(__dirname, (eventType, filename) => {
    if (filename === '.gacha-request.json' && (eventType === 'change' || eventType === 'rename')) {
      handleGachaRequest();
    }
  });
}

// 単発実行モード
async function singleRun() {
  await handleGachaRequest();
}

// メイン処理
const args = process.argv.slice(2);

if (args.includes('--test')) {
  // ジェネレーターのテスト
  testGenerators().catch(console.error);
} else if (args.includes('--watch')) {
  // 監視モード
  watchMode();
} else if (args.includes('--config')) {
  // 設定の表示/変更
  if (args.length > args.indexOf('--config') + 1) {
    const generatorType = args[args.indexOf('--config') + 1];
    generatorFactory.updateConfig({ generator: generatorType });
    console.log(`✅ Generator changed to: ${generatorType}`);
  } else {
    const config = generatorFactory.getConfig();
    console.log('Current configuration:');
    console.log(JSON.stringify(config, null, 2));
  }
} else {
  // 単発実行
  singleRun().catch(console.error);
}