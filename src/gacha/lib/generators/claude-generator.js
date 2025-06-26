const BaseGenerator = require('./base-generator');
const fs = require('fs');
const path = require('path');

class ClaudeGenerator extends BaseGenerator {
  constructor(config = {}) {
    super(config);
    this.command = config.command || 'claude';
    this.promptFile = path.join(process.cwd(), '.gacha-prompt.txt');
  }

  /**
   * Claude CLIを使ってメッセージを生成
   * @param {Object} category - カテゴリ情報
   * @param {Object} rarity - レアリティ情報
   * @returns {Promise<Object>} 生成されたメッセージデータ
   */
  async generate(category, rarity) {
    const prompt = this.buildPrompt(category, rarity);
    
    try {
      // 方法1: ファイル経由でプロンプトを渡す
      fs.writeFileSync(this.promptFile, prompt);
      
      // Claudeコマンドの実行（仮想的な例）
      // 実際のClaude CLIの仕様に応じて調整が必要
      const args = ['chat', '--file', this.promptFile];
      const output = await this.executeCLI(this.command, args);
      
      // プロンプトファイルを削除
      if (fs.existsSync(this.promptFile)) {
        fs.unlinkSync(this.promptFile);
      }
      
      return this.extractJSON(output);
      
    } catch (error) {
      // 方法2: 標準入力経由でプロンプトを渡す
      if (error.message.includes('Unknown option') || error.message.includes('--file')) {
        console.log('Trying stdin method...');
        
        try {
          const output = await this.executeCLI(this.command, [], prompt);
          return this.extractJSON(output);
        } catch (stdinError) {
          // 方法3: 対話的な入力をシミュレート
          console.log('Trying interactive method...');
          return await this.generateInteractive(prompt);
        }
      }
      
      throw error;
    } finally {
      // クリーンアップ
      if (fs.existsSync(this.promptFile)) {
        fs.unlinkSync(this.promptFile);
      }
    }
  }

  /**
   * 対話的な方法でClaude CLIを使用
   * @param {string} prompt - プロンプト
   * @returns {Promise<Object>} 生成されたデータ
   */
  async generateInteractive(prompt) {
    const { spawn } = require('child_process');
    
    return new Promise((resolve, reject) => {
      const child = spawn(this.command, [], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      let jsonBuffer = '';
      let inJson = false;
      let promptSent = false;
      let timeoutId;

      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
        child.removeAllListeners();
      };

      timeoutId = setTimeout(() => {
        cleanup();
        child.kill('SIGTERM');
        reject(new Error(`Command timed out after ${this.timeout}ms`));
      }, this.timeout);

      child.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        
        // CLIが入力を待っている場合、プロンプトを送信
        if (!promptSent && (text.includes('>') || text.includes('?') || text.includes('User:'))) {
          promptSent = true;
          child.stdin.write(prompt + '\n');
        }
        
        // JSON検出ロジック
        if (text.includes('{') || inJson) {
          inJson = true;
          jsonBuffer += text;
          
          try {
            // 完全なJSONかチェック
            const parsed = JSON.parse(jsonBuffer);
            if (parsed.comparisons && parsed.lowUsageMessages) {
              cleanup();
              child.kill('SIGTERM');
              resolve(parsed);
            }
          } catch (e) {
            // JSONがまだ完全でない場合は継続
          }
        }
      });

      child.stderr.on('data', (data) => {
        console.error('Claude stderr:', data.toString());
      });

      child.on('error', (error) => {
        cleanup();
        reject(error);
      });

      child.on('close', (code) => {
        cleanup();
        
        // 出力からJSONを抽出
        try {
          const result = this.extractJSON(output);
          resolve(result);
        } catch (error) {
          reject(new Error(`Failed to extract JSON from output: ${error.message}`));
        }
      });

      // 初期プロンプトを送信（CLIが即座に入力を待つ場合）
      setTimeout(() => {
        if (!promptSent) {
          promptSent = true;
          child.stdin.write(prompt + '\n');
        }
      }, 100);
    });
  }

  /**
   * Claudeに最適化されたプロンプトを構築
   */
  buildPrompt(category, rarity) {
    // 基本プロンプトを取得
    let prompt = super.buildPrompt(category, rarity);
    
    // Claude固有の最適化
    prompt = 'あなたはJSON生成に特化したアシスタントです。以下の指示に従って、正確なJSON形式のデータのみを出力してください。説明や追加のテキストは一切含めないでください。\n\n' + prompt;
    
    // レアリティ別の特別な指示を追加
    if (rarity.id === 'LR') {
      prompt += '\n\nレジェンドレアなので、特に面白く印象的なアイテムを含めてください。';
    }
    
    return prompt;
  }
}

module.exports = ClaudeGenerator;