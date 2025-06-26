const BaseGenerator = require('./base-generator');
const fs = require('fs');
const path = require('path');

class GeminiGenerator extends BaseGenerator {
  constructor(config = {}) {
    super(config);
    this.command = config.command || 'gemini';
    this.promptFile = path.join(process.cwd(), '.gacha-prompt.txt');
  }

  /**
   * Gemini CLIを使ってメッセージを生成
   * @param {Object} category - カテゴリ情報
   * @param {Object} rarity - レアリティ情報
   * @returns {Promise<Object>} 生成されたメッセージデータ
   */
  async generate(category, rarity) {
    const prompt = this.buildPrompt(category, rarity);
    
    try {
      // Gemini CLIの実際の仕様に基づく実行
      const args = ['-p', prompt];
      const output = await this.executeCLI(this.command, args);
      
      return this.extractJSON(output);
      
    } catch (error) {
      // エラーが発生した場合、標準入力経由を試す
      console.log('Trying stdin method...');
      
      try {
        return await this.generateWithStdin(prompt);
      } catch (stdinError) {
        console.error('Both methods failed:', error.message, stdinError.message);
        throw error;
      }
    }
  }

  /**
   * 標準入力経由でGemini CLIを使用
   * @param {string} prompt - プロンプト
   * @returns {Promise<Object>} 生成されたデータ
   */
  async generateWithStdin(prompt) {
    const { spawn } = require('child_process');
    
    return new Promise((resolve, reject) => {
      const child = spawn(this.command, [], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      let jsonBuffer = '';
      let inJson = false;
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
        console.error('Gemini stderr:', data.toString());
      });

      child.on('error', (error) => {
        cleanup();
        reject(error);
      });

      child.on('close', (code) => {
        cleanup();
        
        if (code !== 0) {
          reject(new Error(`Gemini exited with code ${code}`));
        } else {
          try {
            const result = this.extractJSON(output);
            resolve(result);
          } catch (error) {
            reject(new Error(`Failed to extract JSON from output: ${error.message}`));
          }
        }
      });

      // プロンプトを標準入力に送信
      child.stdin.write(prompt);
      child.stdin.end();
    });
  }

  /**
   * Geminiに最適化されたプロンプトを構築
   */
  buildPrompt(category, rarity) {
    // 基本プロンプトを取得
    let prompt = super.buildPrompt(category, rarity);
    
    // Gemini固有の最適化
    prompt = 'Task: Generate JSON data only. Do not include any explanations or additional text.\n\n' + prompt;
    
    // JSON形式を強調
    prompt += '\n\nOutput format: JSON only, no markdown code blocks, no explanations.';
    
    return prompt;
  }

  /**
   * Gemini特有のJSON抽出（必要に応じてオーバーライド）
   */
  extractJSON(output) {
    // Geminiが```json```ブロックを使わない場合の対応
    const cleanOutput = output.trim();
    
    // 直接JSONとして始まっているか確認
    if (cleanOutput.startsWith('{')) {
      try {
        return JSON.parse(cleanOutput);
      } catch (e) {
        // 失敗したら親クラスのメソッドを使用
      }
    }
    
    // 親クラスの抽出メソッドを使用
    return super.extractJSON(output);
  }
}

module.exports = GeminiGenerator;