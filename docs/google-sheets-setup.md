# Google Sheets連携セットアップガイド

Google Sheets連携機能を使用するには、Google Cloud Projectの設定が必要です。

## 事前準備

### 1. Google Cloud Projectの作成

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. 新しいプロジェクトを作成（または既存のプロジェクトを選択）
3. プロジェクト名は任意（例: "ccusage-slack"）

### 2. Google Sheets APIの有効化

1. 左側メニューから「APIとサービス」→「ライブラリ」を選択
2. "Google Sheets API"を検索
3. 「有効にする」をクリック

### 3. OAuth 2.0認証情報の作成

1. 「APIとサービス」→「認証情報」を選択
2. 「+ 認証情報を作成」→「OAuth クライアント ID」を選択
3. 初回の場合は「同意画面を構成」が必要：
   - ユーザータイプ: 「外部」を選択
   - アプリ名: 任意（例: "ccusage-slack"）
   - ユーザーサポートメール: あなたのメールアドレス
   - 開発者の連絡先情報: あなたのメールアドレス
   - スコープは追加不要（後で自動設定）
   - テストユーザーは追加不要

4. OAuth クライアント IDの作成：
   - アプリケーションの種類: 「ウェブアプリケーション」
   - 名前: 任意（例: "ccusage-slack-client"）
   - 承認済みのリダイレクトURI: `http://localhost:3000/oauth2callback`を追加
   - 「作成」をクリック

5. 作成されたクライアントIDとクライアントシークレットをメモ

## セットアップ方法

### 方法1: 環境変数を使用（推奨）

`.env`ファイルに以下を追加：

```bash
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

### 方法2: 認証情報ファイルを使用

1. OAuth 2.0クライアントIDの右側の「ダウンロード」ボタンをクリック
2. ダウンロードしたJSONファイルを`data/.google-credentials.json`として保存

## 実行手順

```bash
# 初期設定
npm run setup:google

# 通常起動
npm start
```

## トラブルシューティング

### エラー: "The sheets.googleapis.com API requires a quota project"

このエラーは、プロジェクトIDが設定されていない場合に発生します。上記の手順に従って、適切なGoogle Cloud Projectを作成し、認証情報を設定してください。

### エラー: "redirect_uri_mismatch"

リダイレクトURIが一致しない場合に発生します。Google Cloud Consoleで設定したリダイレクトURIが`http://localhost:3000/oauth2callback`であることを確認してください。

### 無料枠について

Google Sheets APIの無料枠：
- 1日あたり500,000リクエスト
- 1分あたり100リクエスト

通常の使用では、これらの制限に達することはありません。