const fs = require('fs');
const path = require('path');

class GeneratorFactory {
  constructor() {
    this.generators = new Map();
    this.configPath = path.join(__dirname, '../../../config/gacha.json');
    this.loadConfig();
  }

  /**
   * 設定ファイルを読み込む
   */
  loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        this.config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
      } else {
        // デフォルト設定
        this.config = {
          generator: 'claude',
          claude: {
            command: 'claude',
            timeout: 30000
          },
          gemini: {
            command: 'gemini',
            timeout: 30000
          }
        };
      }
    } catch (error) {
      console.error('Failed to load config:', error);
      this.config = { generator: 'claude' };
    }
  }

  /**
   * ジェネレーターを作成する
   * @param {string} type - ジェネレータータイプ（省略時は設定から読み込み）
   * @returns {BaseGenerator} ジェネレーターインスタンス
   */
  create(type = null) {
    const generatorType = type || this.config.generator || 'claude';
    
    // キャッシュされたジェネレーターがあれば返す
    if (this.generators.has(generatorType)) {
      return this.generators.get(generatorType);
    }

    // 新しいジェネレーターを作成
    let generator;
    try {
      switch (generatorType) {
        case 'claude':
          const ClaudeGenerator = require('./generators/claude-generator');
          generator = new ClaudeGenerator(this.config.claude || {});
          break;
          
        case 'gemini':
          const GeminiGenerator = require('./generators/gemini-generator');
          generator = new GeminiGenerator(this.config.gemini || {});
          break;
          
          
        default:
          throw new Error(`Unknown generator type: ${generatorType}`);
      }

      // キャッシュに保存
      this.generators.set(generatorType, generator);
      return generator;
      
    } catch (error) {
      console.error(`Failed to create generator ${generatorType}:`, error);
      
      
      throw error;
    }
  }

  /**
   * 利用可能なジェネレーターのリストを取得
   * @returns {Array<string>} ジェネレータータイプのリスト
   */
  getAvailableGenerators() {
    const generators = ['claude', 'gemini'];
    const available = [];
    
    for (const type of generators) {
      try {
        require.resolve(`./generators/${type}-generator`);
        available.push(type);
      } catch (e) {
        // ファイルが存在しない場合はスキップ
      }
    }
    
    return available;
  }

  /**
   * 現在の設定を取得
   * @returns {Object} 設定オブジェクト
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * 設定を更新
   * @param {Object} newConfig - 新しい設定
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
    
    // キャッシュをクリア
    this.generators.clear();
  }

  /**
   * ジェネレーターをテスト
   * @param {string} type - テストするジェネレータータイプ
   * @returns {Promise<boolean>} テスト結果
   */
  async testGenerator(type) {
    try {
      const generator = this.create(type);
      
      // 簡単なテストプロンプトで動作確認
      const testCategory = { id: 'tech', name: 'Tech系' };
      const testRarity = { id: 'N', name: 'Normal', stars: '☆' };
      
      const result = await generator.generate(testCategory, testRarity);
      
      // 必要なフィールドが含まれているか確認
      return !!(
        result &&
        result.comparisons &&
        Array.isArray(result.comparisons) &&
        result.lowUsageMessages &&
        Array.isArray(result.lowUsageMessages) &&
        result.templates &&
        result.thresholds
      );
    } catch (error) {
      console.error(`Generator test failed for ${type}:`, error);
      return false;
    }
  }
}

// シングルトンインスタンスをエクスポート
module.exports = new GeneratorFactory();