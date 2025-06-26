const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class BaseGenerator {
  constructor(config = {}) {
    this.config = config;
    this.timeout = config.timeout || 30000;
  }

  /**
   * メッセージを生成する（サブクラスで実装）
   * @param {Object} category - カテゴリ情報
   * @param {Object} rarity - レアリティ情報
   * @returns {Promise<Object>} 生成されたメッセージデータ
   */
  async generate(category, rarity) {
    throw new Error('generate() must be implemented by subclass');
  }

  /**
   * プロンプトを構築する
   * @param {Object} category - カテゴリ情報
   * @param {Object} rarity - レアリティ情報
   * @returns {string} プロンプト文字列
   */
  buildPrompt(category, rarity) {
    const priceRange = this.getPriceRange(rarity.id);
    const itemCount = this.getItemCount(rarity.id);
    
    return `以下の条件でClaudeの使用料金比較メッセージをJSON形式で生成してください。
必ずJSON形式のみを出力し、説明や追加のテキストは含めないでください。

カテゴリ: ${category.name}（${this.getCategoryDescription(category.id)}）
レアリティ: ${rarity.name}（${rarity.stars}）

生成する形式:
{
  "comparisons": [
    { "usd": 数値, "item": "商品やサービス名" }
    // ${itemCount}個以上、価格帯は$${priceRange.min}-$${priceRange.max}
  ],
  "lowUsageMessages": [
    "使用量が少ない時のユーモラスなメッセージ"
    // 7個、${category.name}に関連した内容で
  ],
  "templates": {
    "savingsComparison": "今月は{item}程度の節約 (合計: {totalCost}, 節約: {savings})",
    "buffetMode": "Claude Max食べ放題中 ({totalCost})",
    "lowUsage": "{message} ({totalCost})",
    "highUsageDefault": "${this.getHighUsageMessage(rarity.id)}"
  },
  "thresholds": {
    "savingsComparisonMin": 12,
    "buffetModeMin": 0
  }
}

${this.getAdditionalPrompt(category, rarity)}`;
  }

  /**
   * CLIコマンドを実行する
   * @param {string} command - コマンド名
   * @param {Array<string>} args - コマンド引数
   * @param {string} input - 標準入力に送るデータ
   * @returns {Promise<string>} コマンド出力
   */
  async executeCLI(command, args = [], input = '') {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';
      let timedOut = false;

      const timeout = setTimeout(() => {
        timedOut = true;
        child.kill('SIGTERM');
      }, this.timeout);

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('error', (error) => {
        clearTimeout(timeout);
        if (error.code === 'ENOENT') {
          const installGuide = this.getInstallGuide(command);
          reject(new Error(installGuide));
        } else {
          reject(new Error(`Failed to execute ${command}: ${error.message}`));
        }
      });

      child.on('close', (code) => {
        clearTimeout(timeout);
        if (timedOut) {
          reject(new Error(`Command timed out after ${this.timeout}ms`));
        } else if (code !== 0) {
          reject(new Error(`Command exited with code ${code}: ${stderr}`));
        } else {
          resolve(stdout);
        }
      });

      if (input) {
        child.stdin.write(input);
        child.stdin.end();
      }
    });
  }

  /**
   * テキスト出力からJSONを抽出する
   * @param {string} output - CLIツールの出力
   * @returns {Object} 抽出されたJSON
   */
  extractJSON(output) {
    // 方法1: コードブロックからJSONを抽出
    const codeBlockMatch = output.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
    if (codeBlockMatch) {
      try {
        return JSON.parse(codeBlockMatch[1]);
      } catch (e) {
        console.error('Failed to parse JSON from code block:', e);
      }
    }

    // 方法2: 直接JSONオブジェクトを探す
    const jsonMatch = output.match(/\{[\s\S]*"comparisons"[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.error('Failed to parse JSON directly:', e);
      }
    }

    // 方法3: 行ごとに解析
    const lines = output.split('\n');
    let jsonStr = '';
    let inJson = false;
    let braceCount = 0;

    for (const line of lines) {
      if (!inJson && line.includes('{')) {
        inJson = true;
      }
      
      if (inJson) {
        jsonStr += line + '\n';
        braceCount += (line.match(/\{/g) || []).length;
        braceCount -= (line.match(/\}/g) || []).length;
        
        if (braceCount === 0 && jsonStr.trim()) {
          try {
            return JSON.parse(jsonStr);
          } catch (e) {
            console.error('Failed to parse accumulated JSON:', e);
            jsonStr = '';
            inJson = false;
          }
        }
      }
    }

    throw new Error('No valid JSON found in output');
  }

  /**
   * レアリティに応じた価格帯を取得
   */
  getPriceRange(rarityId) {
    const ranges = {
      N: { min: 0, max: 200 },
      R: { min: 3, max: 10000 },
      SR: { min: 4, max: 10000 },
      UR: { min: 10, max: 50000 },
      LR: { min: 100, max: 100000 }
    };
    return ranges[rarityId] || ranges.N;
  }

  /**
   * レアリティに応じたアイテム数を取得
   */
  getItemCount(rarityId) {
    const counts = {
      N: 30,
      R: 32,
      SR: 35,
      UR: 40,
      LR: 45
    };
    return counts[rarityId] || 30;
  }

  /**
   * カテゴリの説明を取得
   */
  getCategoryDescription(categoryId) {
    const descriptions = {
      tech: '開発ツール、SaaS、技術系サービス',
      gadget: 'ガジェット、電子機器、ハードウェア',
      food: '食べ物、飲み物、レストラン',
      entertainment: 'エンタメ、サブスク、趣味',
      life: '生活用品、日用品、サービス'
    };
    return descriptions[categoryId] || '';
  }

  /**
   * 高使用量時のメッセージを取得
   */
  getHighUsageMessage(rarityId) {
    const messages = {
      N: 'もはやスタートアップのサーバー代レベル',
      R: 'もはや中小企業のIT予算レベル',
      SR: 'もはやユニコーン企業の開発費レベル',
      UR: 'もはやGAFAMのAI研究予算レベル',
      LR: 'もはや国家予算レベル（嘘）'
    };
    return messages[rarityId] || messages.N;
  }

  /**
   * カテゴリとレアリティに応じた追加プロンプト
   */
  getAdditionalPrompt(category, rarity) {
    let prompt = '\n重要な指示:\n';
    
    // カテゴリ別の特別な指示
    if (category.id === 'tech') {
      prompt += '- 実在する開発ツールやSaaSサービスを中心に含めてください\n';
      prompt += '- Claude Max ($200)を必ず含めてください\n';
    } else if (category.id === 'gadget') {
      prompt += '- 実在するガジェットや電子機器を含めてください\n';
      prompt += '- Apple製品、PC部品、カメラなどを含めてください\n';
    }
    
    // レアリティ別の特別な指示
    if (rarity.id === 'SR' || rarity.id === 'UR' || rarity.id === 'LR') {
      prompt += '- より面白く、ユニークなアイテムも混ぜてください\n';
      prompt += '- 一部は遊び心のある架空のアイテムでも構いません\n';
    }
    
    return prompt;
  }

  /**
   * CLIツールのインストールガイドを取得
   */
  getInstallGuide(command) {
    if (command === 'claude') {
      return `Claude CLIがインストールされていません。

インストール方法:
1. https://claude.ai/download にアクセス
2. お使いのOSに合わせたClaude Desktopをダウンロード
3. インストール後、ターミナルで 'claude' コマンドが使えることを確認

詳細: https://docs.anthropic.com/claude/docs/claude-desktop`;
    } else if (command === 'gemini') {
      return `Gemini CLIがインストールされていません。

インストール方法:
npm install -g @genkit-ai/cli

または、プロジェクトの設定ファイル (gacha-config.json) で
別のジェネレーターに切り替えてください:
node gacha-handler.js --config claude`;
    }
    
    return `${command} コマンドが見つかりません。インストールされているか確認してください。`;
  }
}

module.exports = BaseGenerator;