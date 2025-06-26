const fs = require('fs').promises;
const path = require('path');
const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const open = require('open');
const http = require('http');
const url = require('url');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const TOKEN_PATH = path.join(__dirname, '../../data/.google-token.json');
const CREDENTIALS_PATH = path.join(__dirname, '../../data/.google-credentials.json');
const REDIRECT_URI = 'http://localhost:3000/oauth2callback';

class GoogleAuth {
  constructor() {
    this.oAuth2Client = null;
  }

  /**
   * Initialize OAuth2 client and authenticate
   */
  async authenticate() {
    // Try to load credentials from file first
    let credentials;
    try {
      const credentialsData = await fs.readFile(CREDENTIALS_PATH, 'utf8');
      credentials = JSON.parse(credentialsData);
    } catch (error) {
      // If no credentials file, use environment variables or prompt user
      console.log('\n⚠️  Google Cloud認証情報が見つかりません');
      console.log('\n以下の手順で認証情報を設定してください:');
      console.log('\n1. Google Cloud Consoleにアクセス: https://console.cloud.google.com/');
      console.log('2. プロジェクトを作成または選択');
      console.log('3. APIとサービス > 認証情報 > OAuth 2.0 クライアント IDを作成');
      console.log('4. アプリケーションの種類: ウェブアプリケーション');
      console.log('5. 承認済みのリダイレクトURI: http://localhost:3000/oauth2callback');
      console.log('6. 作成されたクライアントIDとシークレットを以下の環境変数に設定:');
      console.log('   - GOOGLE_CLIENT_ID');
      console.log('   - GOOGLE_CLIENT_SECRET');
      console.log('\nまたは、認証情報JSONファイルをダウンロードして、');
      console.log(`${CREDENTIALS_PATH} に保存してください\n`);
      
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        throw new Error('Google認証情報が設定されていません');
      }
      
      credentials = {
        installed: {
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          redirect_uris: [REDIRECT_URI]
        }
      };
    }

    // Create OAuth2 client
    const { client_id, client_secret, redirect_uris } = credentials.installed || credentials.web;
    this.oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0] || REDIRECT_URI
    );

    // Try to load existing token
    try {
      const token = await this.loadToken();
      this.oAuth2Client.setCredentials(token);
      
      // Verify token is still valid
      await this.verifyToken();
      console.log('✅ Using existing Google authentication');
      return this.oAuth2Client;
    } catch (error) {
      console.log('🔄 Need new Google authentication');
      return await this.getNewToken();
    }
  }

  /**
   * Load saved token from file
   */
  async loadToken() {
    const tokenData = await fs.readFile(TOKEN_PATH, 'utf8');
    return JSON.parse(tokenData);
  }

  /**
   * Save token to file
   */
  async saveToken(token) {
    await fs.mkdir(path.dirname(TOKEN_PATH), { recursive: true });
    await fs.writeFile(TOKEN_PATH, JSON.stringify(token, null, 2));
  }

  /**
   * Verify token is still valid
   */
  async verifyToken() {
    const oauth2 = google.oauth2({
      auth: this.oAuth2Client,
      version: 'v2'
    });
    await oauth2.userinfo.get();
  }

  /**
   * Get new token through OAuth2 flow
   */
  async getNewToken() {
    return new Promise((resolve, reject) => {
      // Generate auth URL
      const authUrl = this.oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent'
      });

      // Create temporary server for OAuth callback
      const server = http.createServer(async (req, res) => {
        try {
          const parsedUrl = url.parse(req.url, true);
          
          if (parsedUrl.pathname === '/oauth2callback') {
            const code = parsedUrl.query.code;
            
            if (code) {
              // Exchange code for token
              const { tokens } = await this.oAuth2Client.getToken(code);
              this.oAuth2Client.setCredentials(tokens);
              
              // Save token
              await this.saveToken(tokens);
              
              // Send success response
              res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
              res.end(`
                <html>
                  <head>
                    <title>認証成功</title>
                    <style>
                      body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                      .success { color: #4CAF50; font-size: 24px; }
                      .message { margin-top: 20px; color: #666; }
                    </style>
                  </head>
                  <body>
                    <div class="success">✅ Google認証が完了しました！</div>
                    <div class="message">このウィンドウを閉じて、ターミナルに戻ってください。</div>
                  </body>
                </html>
              `);
              
              // Close server
              server.close();
              resolve(this.oAuth2Client);
            } else {
              throw new Error('No authorization code received');
            }
          }
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('認証エラーが発生しました');
          server.close();
          reject(error);
        }
      });

      // Start server
      server.listen(3000, async () => {
        console.log('🌐 認証サーバーを起動しました (http://localhost:3000)');
        console.log('🔗 ブラウザで認証ページを開いています...');
        
        // Open browser
        try {
          await open(authUrl);
        } catch (error) {
          console.log('\n⚠️  ブラウザを自動で開けませんでした。');
          console.log('以下のURLを手動でブラウザに貼り付けてください:');
          console.log('\n' + authUrl + '\n');
        }
      });

      // Timeout after 5 minutes
      setTimeout(() => {
        server.close();
        reject(new Error('Authentication timeout'));
      }, 300000);
    });
  }

  /**
   * Get authenticated Google Sheets client
   */
  async getSheetsClient() {
    if (!this.oAuth2Client) {
      await this.authenticate();
    }
    
    return google.sheets({ version: 'v4', auth: this.oAuth2Client });
  }

  /**
   * Get user info
   */
  async getUserInfo() {
    if (!this.oAuth2Client) {
      await this.authenticate();
    }

    const oauth2 = google.oauth2({
      auth: this.oAuth2Client,
      version: 'v2'
    });
    
    const { data } = await oauth2.userinfo.get();
    return data;
  }
}

module.exports = GoogleAuth;