// Claude Code用のガチャリクエストハンドラ
// このファイルは、.gacha-request.jsonを監視して自動的にmessage.jsonの内容を生成します

const fs = require('fs');
const path = require('path');

// カテゴリ別の生成ロジック
const generators = {
  tech: {
    N: () => ({
      comparisons: [
        { usd: 0, item: "VS Code 1年分 (無料だけど)" },
        { usd: 4, item: "GitHub Team 1ヶ月分" },
        { usd: 5, item: "GitHub Personal 1ヶ月分" },
        { usd: 7, item: "npm Pro 1ヶ月分" },
        { usd: 8.75, item: "Slack Pro 1ヶ月分" },
        { usd: 9, item: "Heroku Eco Dyno 1ヶ月分" },
        { usd: 10, item: "GitHub Copilot Individual 1ヶ月分" },
        { usd: 12, item: "Notion Plus 1ヶ月分" },
        { usd: 14, item: "Linear Team 1ヶ月分" },
        { usd: 15, item: "Postman Team 1ヶ月分" },
        { usd: 16, item: "Figma Personal 1ヶ月分" },
        { usd: 20, item: "ChatGPT Plus 1ヶ月分" },
        { usd: 20, item: "Vercel Pro 1ヶ月分" },
        { usd: 25, item: "Copilot Business 1ヶ月分" },
        { usd: 30, item: "Datadog Pro 1ヶ月分" },
        { usd: 40, item: "技術書 1冊分" },
        { usd: 50, item: "Pluralsight 1ヶ月分" },
        { usd: 60, item: "O'Reilly Learning 1ヶ月分" },
        { usd: 63.62, item: "JetBrains全製品 1ヶ月分" },
        { usd: 69.99, item: "Adobe Creative Cloud 1ヶ月分" },
        { usd: 80, item: "IntelliJ IDEA 1ヶ月分" },
        { usd: 100, item: "AWS 個人利用 1ヶ月分" },
        { usd: 150, item: "技術カンファレンス参加費" },
        { usd: 200, item: "Claude Max 1ヶ月分" },
        { usd: 300, item: "GitHub Enterprise 1ヶ月分" },
        { usd: 400, item: "開発チームのツール代 1ヶ月分" },
        { usd: 500, item: "スタートアップのSaaS費用" },
        { usd: 659.88, item: "Adobe Creative Cloud 年間分" },
        { usd: 763.42, item: "JetBrains全製品 年間分" },
        { usd: 1000, item: "エンタープライズSaaS 1ヶ月分" },
        { usd: 2000, item: "小規模チームの年間ツール代" },
        { usd: 5000, item: "中規模企業のIT予算 1ヶ月分" }
      ],
      lowUsageMessages: [
        "まだバグと戦う余力あり",
        "コンパイルエラーより節約エラー",
        "Claude使用量 < コーヒー消費量",
        "もっとAIに頼ってもいいのよ",
        "定額の恩恵を受けきれていない",
        "まだまだClaudeと遊べる",
        "Claude Max のポテンシャル未開拓"
      ]
    }),
    R: () => ({
      comparisons: [
        { usd: 3, item: "Todoist Pro 1ヶ月分" },
        { usd: 5, item: "Cursor Free 1ヶ月分" },
        { usd: 8, item: "1Password個人版 1ヶ月分" },
        { usd: 10, item: "Supabase Pro 1ヶ月分" },
        { usd: 12, item: "Grammarly Premium 1ヶ月分" },
        { usd: 15, item: "Anthropic API クレジット" },
        { usd: 18, item: "Spotify Premium 1ヶ月分" },
        { usd: 20, item: "Cursor Pro 1ヶ月分" },
        { usd: 25, item: "Railway Team 1ヶ月分" },
        { usd: 30, item: "Vercel Pro 1ヶ月分" },
        { usd: 35, item: "Cloudinary Plus 1ヶ月分" },
        { usd: 40, item: "Retool Team 1ヶ月分" },
        { usd: 45, item: "SendGrid Pro 1ヶ月分" },
        { usd: 50, item: "Linear Pro 1ヶ月分" },
        { usd: 70, item: "Sentry Business 1ヶ月分" },
        { usd: 90, item: "Algolia Community 1ヶ月分" },
        { usd: 100, item: "Cloudflare Workers 無制限" },
        { usd: 120, item: "PlanetScale Team 1ヶ月分" },
        { usd: 150, item: "New Relic Pro 1ヶ月分" },
        { usd: 180, item: "Segment Team 1ヶ月分" },
        { usd: 200, item: "Claude Max 1ヶ月分" },
        { usd: 250, item: "Netlify Business 1ヶ月分" },
        { usd: 300, item: "GitHub Enterprise 1ヶ月分" },
        { usd: 400, item: "Auth0 Professional 1ヶ月分" },
        { usd: 500, item: "Datadog Enterprise 1ヶ月分" },
        { usd: 700, item: "Snowflake Standard 1ヶ月分" },
        { usd: 1000, item: "スタートアップのインフラ代" },
        { usd: 1500, item: "MongoDB Atlas Dedicated" },
        { usd: 2000, item: "エンタープライズAPI費用" },
        { usd: 3000, item: "MLOps基盤 1ヶ月分" },
        { usd: 5000, item: "大規模SaaSの月額費用" },
        { usd: 10000, item: "AI開発環境の維持費" }
      ],
      lowUsageMessages: [
        "AIペアプロ不足を検知",
        "Claude「もっと質問して？」",
        "使用量警告: 低すぎます",
        "月額課金の意味を問い直そう",
        "Claudeが寂しがってます",
        "サブスク代の無駄遣い防止課から警告",
        "もっと使わないと元が取れません",
        "Claude Maxの真価を発揮せよ"
      ]
    }),
    SR: () => ({
      comparisons: [
        { usd: 4.04, item: "404 Not Found記念グッズ" },
        { usd: 8.08, item: "無限ループ脱出お守り" },
        { usd: 10, item: "エンジニア向け瞑想アプリ年間" },
        { usd: 16.16, item: "16進数マニア会費" },
        { usd: 20, item: "バグ発生時の精神安定剤1ヶ月分" },
        { usd: 25.25, item: "クォーター記念日祝い金" },
        { usd: 30, item: "深夜デバッグ用エナドリ30本" },
        { usd: 42, item: "生命、宇宙、すべての答え" },
        { usd: 50, item: "ラバーダック100体セット" },
        { usd: 64, item: "64bit記念メダル" },
        { usd: 69.42, item: "完璧に計算されたサブスク代" },
        { usd: 86.40, item: "1日分の秒数セント" },
        { usd: 100, item: "「動いてるコードには触るな」の石碑" },
        { usd: 127, item: "ASCIIコード全文字分の募金" },
        { usd: 144, item: "グロス記念パーティー" },
        { usd: 200, item: "Claude Max (使い切れない分)" },
        { usd: 255, item: "RGB最大値記念品" },
        { usd: 256, item: "2の8乗ドル記念" },
        { usd: 314.15, item: "円周率グッズセット" },
        { usd: 365, item: "1年365日サポート" },
        { usd: 404, item: "ページが見つかりません基金" },
        { usd: 418, item: "私はティーポット協会年会費" },
        { usd: 500, item: "本番環境でテストする勇気" },
        { usd: 512, item: "2の9乗記念イベント" },
        { usd: 666, item: "悪魔のバグ退治サービス" },
        { usd: 777, item: "ラッキーセブンデプロイ" },
        { usd: 1000, item: "キロバイト記念館入場料" },
        { usd: 1024, item: "1KB完全制覇証明書" },
        { usd: 1337, item: "エリートハッカー認定料" },
        { usd: 2048, item: "2048ゲーム世界大会参加費" },
        { usd: 3000, item: "Y3K問題対策基金" },
        { usd: 8080, item: "ポート番号コレクション" },
        { usd: 9999, item: "カンスト寸前の緊張感" }
      ],
      lowUsageMessages: [
        "error: Claude使用量が少なすぎます",
        "if (usage < 200) { return 'もったいない'; }",
        "TODO: もっとClaude使う",
        "// FIXME: 月額課金の無駄遣い",
        "console.warn('Subscription underutilized')",
        "git commit -m 'feat: Claude使用量を増やす'",
        "assert(usage >= 200, 'サブスク代回収失敗')",
        "throw new Error('使用量不足例外')"
      ]
    })
  },
  gadget: {
    N: () => ({
      comparisons: [
        { usd: 5, item: "スマホケース 1個" },
        { usd: 10, item: "USB-Cケーブル 1本" },
        { usd: 15, item: "スマホスタンド" },
        { usd: 20, item: "ワイヤレスマウス エントリーモデル" },
        { usd: 25, item: "急速充電器 20W" },
        { usd: 30, item: "Bluetooth キーボード" },
        { usd: 40, item: "モバイルバッテリー 10000mAh" },
        { usd: 50, item: "Webカメラ 1080p" },
        { usd: 60, item: "ゲーミングマウスパッド" },
        { usd: 75, item: "Samsung 980 PRO 1TB" },
        { usd: 80, item: "USB-C ハブ 基本モデル" },
        { usd: 90, item: "USB-C ハブ Anker 高性能版" },
        { usd: 99, item: "Magic Mouse" },
        { usd: 120, item: "外付けSSD 1TB" },
        { usd: 130, item: "Samsung 980 PRO 2TB" },
        { usd: 130, item: "AirPods (第3世代)" },
        { usd: 149, item: "Magic Trackpad" },
        { usd: 180, item: "ワイヤレス充電器 3-in-1" },
        { usd: 199, item: "Magic Keyboard テンキー付き" },
        { usd: 200, item: "Claude Max 1ヶ月分" },
        { usd: 242, item: "Realforce R3 45g" },
        { usd: 248, item: "Magic Mouse + Magic Trackpad" },
        { usd: 250, item: "CalDigit TS3 Plus" },
        { usd: 250, item: "AirPods Pro" },
        { usd: 270, item: "Dell UltraSharp 24inch" },
        { usd: 299, item: "NVIDIA RTX 4060" },
        { usd: 300, item: "メカニカルキーボード" },
        { usd: 320, item: "HHKB Professional HYBRID" },
        { usd: 349, item: "iPad Pro 11inch 256GB" },
        { usd: 400, item: "CalDigit TS4 Thunderbolt 4" },
        { usd: 400, item: "iPad (第10世代)" },
        { usd: 450, item: "CalDigit USB-C SOHO ドック" },
        { usd: 500, item: "PS5 or Xbox Series X" },
        { usd: 579, item: "NVIDIA RTX 4070" },
        { usd: 599, item: "iPad Pro 12.9inch 512GB" },
        { usd: 650, item: "Samsung 980 PRO 4TB" },
        { usd: 689, item: "NVIDIA RTX 4070 Ti" },
        { usd: 700, item: "Meta Quest 3" },
        { usd: 750, item: "Herman Miller Sayl チェア" },
        { usd: 850, item: "LG UltraFine 5K 27inch" },
        { usd: 950, item: "Sony FE 24-70mm F4" },
        { usd: 999, item: "MacBook Air M3 8GB" },
        { usd: 999, item: "M2 Mac mini 16GB" },
        { usd: 999, item: "iPhone 15" },
        { usd: 1300, item: "Herman Miller Aeron チェア" },
        { usd: 1499, item: "NVIDIA RTX 4080" },
        { usd: 1599, item: "MacBook Air M3 16GB" },
        { usd: 1599, item: "Apple Studio Display" },
        { usd: 1599, item: "MacBook Pro 14inch M3" },
        { usd: 1999, item: "Mac Studio M2 Max" },
        { usd: 2000, item: "Sony α7 IV ボディ" },
        { usd: 2199, item: "Sony α7C II ボディ" },
        { usd: 2298, item: "Sony FE 24-70mm F2.8 GM II" },
        { usd: 2495, item: "Blackmagic Pocket Cinema 6K Pro" },
        { usd: 2800, item: "MacBook Pro 14inch M3 Pro" },
        { usd: 2829, item: "NVIDIA RTX 4090" },
        { usd: 3000, item: "iMac 24inch M3 最上位" }
      ],
      lowUsageMessages: [
        "新しいガジェット買えそう",
        "Magic Mouseより安い使用量",
        "ガジェット貯金に回そう",
        "Claude < AirPods",
        "まだまだガジェット購入余力あり",
        "新製品発表まで我慢の時",
        "ポチる前に使用量チェック"
      ]
    }),
    R: () => ({
      comparisons: [
        { usd: 15, item: "Raspberry Pi Zero 2 W" },
        { usd: 25, item: "Arduino Uno R4" },
        { usd: 35, item: "ESP32開発ボード詰め合わせ" },
        { usd: 50, item: "メカニカルキースイッチ 100個" },
        { usd: 75, item: "3Dプリンター用フィラメント 5kg" },
        { usd: 100, item: "電子工作キット上級編" },
        { usd: 150, item: "ポータブルオシロスコープ" },
        { usd: 200, item: "Claude Max 1ヶ月分" },
        { usd: 250, item: "自作キーボードキット premium" },
        { usd: 300, item: "スマートホーム全部入りセット" },
        { usd: 400, item: "ドローン DJI Mini" },
        { usd: 500, item: "3Dプリンター エントリーモデル" },
        { usd: 700, item: "電動スケートボード" },
        { usd: 1000, item: "レーザーカッター 小型" },
        { usd: 1500, item: "CNCマシン デスクトップ" },
        { usd: 2000, item: "産業用3Dプリンター" },
        { usd: 3000, item: "プロ向けドローン一式" },
        { usd: 5000, item: "ガレージ工房スターターセット" }
      ],
      lowUsageMessages: [
        "DIYプロジェクトの予算確保中",
        "次の自作ガジェット資金貯蓄中",
        "メイカーフェア出展費用には程遠い",
        "はんだごての電気代より安い",
        "3Dプリント時間 > Claude使用時間",
        "もっと設計図をAIに描いてもらおう"
      ]
    }),
    SR: () => ({
      comparisons: [
        { usd: 99.99, item: "完璧主義者向けUSBケーブル" },
        { usd: 123.45, item: "連番コレクター記念品" },
        { usd: 200, item: "透明になるキーボード（開発中）" },
        { usd: 256, item: "256GBだけど256ドルのSSD" },
        { usd: 314.15, item: "円周率型マウスパッド" },
        { usd: 420, item: "ゲーミングチェア（ゲームしない人用）" },
        { usd: 500, item: "エアギター世界大会優勝モデル" },
        { usd: 666, item: "呪われたWebカメラ（高画質）" },
        { usd: 777, item: "幸運のキーボード（Enter押すと当たる）" },
        { usd: 999.99, item: "あと1セントで1000ドルセット" },
        { usd: 1111, item: "ゾロ目記念モニター" },
        { usd: 1337, item: "エリートゲーマー専用マウス" },
        { usd: 2020, item: "2020年製造の2020年モデル" },
        { usd: 3333, item: "3が4つ並んだ記念PC" },
        { usd: 4096, item: "4K対応4096段階調光デスクライト" },
        { usd: 5555, item: "5並びで御利益あるらしいタブレット" },
        { usd: 8888, item: "末広がりPC（起動が遅い）" },
        { usd: 9999, item: "もうすぐ5桁の緊張感セット" }
      ],
      lowUsageMessages: [
        "ガジェット沼にはまる前の正常値",
        "散財防止システム作動中",
        "物欲センサー低レベルを検知",
        "まだ理性が残っている証拠",
        "ポチる指が疼いてない状態",
        "Amazon履歴がまだクリーン",
        "配送業者さんに覚えられてないレベル"
      ]
    })
  },
  food: {
    N: () => ({
      comparisons: [
        { usd: 3, item: "コンビニコーヒー 3杯" },
        { usd: 5, item: "スタバ トールラテ 1杯" },
        { usd: 8, item: "マクドナルド セット" },
        { usd: 10, item: "ランチ 1食分" },
        { usd: 12, item: "サブウェイ フットロング" },
        { usd: 15, item: "Uber Eats 最小注文" },
        { usd: 18, item: "ラーメン二郎 大盛り" },
        { usd: 20, item: "ピザMサイズ 1枚" },
        { usd: 25, item: "回転寿司 満腹セット" },
        { usd: 30, item: "焼肉ランチ 1人前" },
        { usd: 35, item: "食べ放題ビュッフェ" },
        { usd: 40, item: "韓国料理コース" },
        { usd: 50, item: "寿司ディナー 1人前" },
        { usd: 60, item: "しゃぶしゃぶ食べ放題" },
        { usd: 70, item: "中華料理フルコース" },
        { usd: 80, item: "飲み放題付き居酒屋" },
        { usd: 90, item: "ホテルビュッフェ" },
        { usd: 100, item: "高級ステーキディナー" },
        { usd: 120, item: "鉄板焼きコース" },
        { usd: 150, item: "フレンチコース料理" },
        { usd: 180, item: "高級焼肉食べ放題" },
        { usd: 200, item: "Claude Max 1ヶ月分" },
        { usd: 250, item: "記念日ディナー" },
        { usd: 300, item: "ミシュラン1つ星ディナー" },
        { usd: 400, item: "高級ホテルアフタヌーンティー5回分" },
        { usd: 500, item: "高級寿司おまかせコース" },
        { usd: 600, item: "ミシュラン2つ星ディナー" },
        { usd: 800, item: "高級中華フカヒレコース" },
        { usd: 1000, item: "ミシュラン3つ星ディナー" },
        { usd: 1500, item: "高級フレンチ with ワインペアリング" },
        { usd: 2000, item: "最高級和牛尽くしコース" },
        { usd: 3000, item: "世界三大珍味フルコース" },
        { usd: 5000, item: "プライベートシェフ1日貸切" }
      ],
      lowUsageMessages: [
        "まだ食べ放題の元取れてない",
        "Claude腹八分目",
        "もっと頼んでも大丈夫だよ",
        "デザートまだ余裕あり",
        "おかわり自由です",
        "満腹中枢がまだ反応してない",
        "食後のコーヒーも余裕で入る"
      ]
    }),
    R: () => ({
      comparisons: [
        { usd: 10, item: "朝食ビュッフェ" },
        { usd: 20, item: "話題のスイーツ店行列セット" },
        { usd: 30, item: "地方名物お取り寄せ" },
        { usd: 40, item: "クラフトビール飲み比べ" },
        { usd: 50, item: "チーズ専門店おまかせ" },
        { usd: 70, item: "日本酒利き酒セット" },
        { usd: 100, item: "A5和牛ステーキ" },
        { usd: 150, item: "蟹食べ放題" },
        { usd: 200, item: "Claude Max 1ヶ月分" },
        { usd: 300, item: "トリュフ尽くしコース" },
        { usd: 500, item: "高級ワイン1本" },
        { usd: 800, item: "キャビア付きコース" },
        { usd: 1000, item: "シャンパンタワー" },
        { usd: 2000, item: "希少部位焼肉コース" },
        { usd: 5000, item: "料亭貸切懐石" }
      ],
      lowUsageMessages: [
        "グルメ欲より知識欲",
        "美食より美コード",
        "満腹感より達成感を選んだ結果",
        "胃袋より頭脳を満たす日々",
        "食欲<知的好奇心",
        "カロリー消費より脳みそ消費"
      ]
    }),
    SR: () => ({
      comparisons: [
        { usd: 12.34, item: "レシート金額が綺麗な定食" },
        { usd: 22.22, item: "ゾロ目価格のラーメン" },
        { usd: 33.33, item: "3が好きな店主の串カツ33本" },
        { usd: 50, item: "50州全部の名物バーガー" },
        { usd: 77.77, item: "ラッキーセブン定食" },
        { usd: 99.99, item: "100円足りない高級弁当" },
        { usd: 123.45, item: "連番になるよう計算されたコース" },
        { usd: 200, item: "Claude Max分のカップ麺" },
        { usd: 365, item: "1年分の日替わり弁当前払い" },
        { usd: 404, item: "メニューにない幻の料理" },
        { usd: 500, item: "ワンコイン（500ドル）ランチ" },
        { usd: 666, item: "激辛地獄ラーメン完食チャレンジ" },
        { usd: 999, item: "あと1ドルで1000ドルの寿司" },
        { usd: 1234.56, item: "会計が美しい懐石料理" },
        { usd: 2048, item: "2048キロカロリーメガ盛り" },
        { usd: 3000, item: "3時間食べ続けるコース" },
        { usd: 10000, item: "ゼロが4つ並ぶ豪華ディナー" }
      ],
      lowUsageMessages: [
        "まだ前菜も来てない状態",
        "食前酒すら飲んでないレベル",
        "おしぼりで手を拭いただけ",
        "メニュー見てる段階",
        "席に着いたばかり",
        "まだ箸も割ってない",
        "注文取りに来てもらえるの待ち"
      ]
    })
  },
  entertainment: {
    N: () => ({
      comparisons: [
        { usd: 4.99, item: "Apple Music 学生プラン" },
        { usd: 6.99, item: "Disney+ ベーシック" },
        { usd: 8.99, item: "Crunchyroll 1ヶ月分" },
        { usd: 9.99, item: "Spotify Premium" },
        { usd: 10, item: "Netflix ベーシック" },
        { usd: 11.99, item: "Hulu 1ヶ月分" },
        { usd: 14.99, item: "HBO Max 1ヶ月分" },
        { usd: 15, item: "Disney+ 1ヶ月分" },
        { usd: 15.49, item: "Netflix スタンダード" },
        { usd: 17.99, item: "YouTube Premium" },
        { usd: 19.99, item: "Netflix プレミアム" },
        { usd: 20, item: "ChatGPT Plus 1ヶ月分" },
        { usd: 22.99, item: "YouTube Premium ファミリー" },
        { usd: 25, item: "映画チケット IMAX" },
        { usd: 30, item: "映画チケット 2枚" },
        { usd: 35, item: "Amazon Prime + 追加チャンネル" },
        { usd: 40, item: "ゲームパス Ultimate" },
        { usd: 50, item: "ゲームソフト 1本" },
        { usd: 60, item: "PlayStation Plus 年間" },
        { usd: 70, item: "年パス割る12ヶ月" },
        { usd: 80, item: "ライブ配信チケット" },
        { usd: 100, item: "コンサートチケット" },
        { usd: 120, item: "スポーツ観戦チケット" },
        { usd: 150, item: "フェスチケット 1日券" },
        { usd: 180, item: "舞台・ミュージカル" },
        { usd: 200, item: "Claude Max 1ヶ月分" },
        { usd: 250, item: "VIPシート ライブ" },
        { usd: 300, item: "テーマパーク家族券" },
        { usd: 400, item: "フェス3日通し券" },
        { usd: 500, item: "年間パスポート" },
        { usd: 700, item: "ファンクラブ年会費全部入り" },
        { usd: 1000, item: "VIP体験パッケージ" },
        { usd: 2000, item: "プレミアムシート年間契約" },
        { usd: 5000, item: "音楽フェス VIPパス全制覇" }
      ],
      lowUsageMessages: [
        "エンタメ予算まだ余裕",
        "もっと楽しんでいいよ",
        "サブスク追加の余地あり",
        "遊び足りない数値",
        "推し活資金はまだ温存",
        "積みゲー消化してから考えよう",
        "Netflix見終わってから次いこう"
      ]
    }),
    R: () => ({
      comparisons: [
        { usd: 15, item: "レトロゲーム月額" },
        { usd: 25, item: "VRゲーム1本" },
        { usd: 40, item: "限定版ゲームソフト" },
        { usd: 60, item: "配信者のメンバーシップ年間" },
        { usd: 80, item: "オンラインライブ特別席" },
        { usd: 100, item: "サイン入りグッズ" },
        { usd: 150, item: "声優イベント参加権" },
        { usd: 200, item: "Claude Max 1ヶ月分" },
        { usd: 300, item: "コミケ遠征費用" },
        { usd: 500, item: "限定フィギュア" },
        { usd: 800, item: "アーケード基板" },
        { usd: 1000, item: "プレミアムグッズセット" },
        { usd: 2000, item: "イベント協賛権" },
        { usd: 5000, item: "推しの誕生日広告" }
      ],
      lowUsageMessages: [
        "推し活より自己研鑽",
        "2次元より3次元（コード）",
        "沼にハマる前の安全圏",
        "財布の紐がまだ固い",
        "理性がまだ勝っている",
        "現実世界にログイン中"
      ]
    }),
    SR: () => ({
      comparisons: [
        { usd: 33.33, item: "3が好きすぎるゲーム会社の株" },
        { usd: 77, item: "ラッキー7チケット7枚" },
        { usd: 99, item: "100円足りないプレミアムパス" },
        { usd: 111.11, item: "ゾロ目席指定料金" },
        { usd: 200, item: "Claude Maxでゲーム作ろう費" },
        { usd: 314.15, item: "円周率記念イベント" },
        { usd: 404, item: "存在しないイベントのチケット" },
        { usd: 555, item: "5並びで5倍楽しいライブ" },
        { usd: 777, item: "パチンコで当たりそうな金額" },
        { usd: 999, item: "millennium記念グッズ" },
        { usd: 1234, item: "連番チケット4枚" },
        { usd: 2020, item: "2020年に買えなかったチケット" },
        { usd: 3000, item: "推しに3000回ありがとう" },
        { usd: 10000, item: "万札で作った紙吹雪" }
      ],
      lowUsageMessages: [
        "まだチュートリアル中",
        "レベル1の初心者",
        "スタート地点から動いてない",
        "セーブデータ作成したばかり",
        "オープニングムービー視聴中",
        "キャラメイクで悩んでる段階",
        "difficulty: Easyでプレイ中"
      ]
    })
  },
  life: {
    N: () => ({
      comparisons: [
        { usd: 3, item: "自販機ドリンク 2本" },
        { usd: 5, item: "電車賃 往復1回分" },
        { usd: 8, item: "コインランドリー 1回" },
        { usd: 10, item: "洗剤・日用品セット" },
        { usd: 15, item: "タクシー初乗り料金" },
        { usd: 20, item: "美容院カット代" },
        { usd: 25, item: "クリーニング代 5点" },
        { usd: 30, item: "電気代 1週間分" },
        { usd: 40, item: "水道代 1ヶ月分" },
        { usd: 50, item: "ガソリン満タン1回" },
        { usd: 60, item: "日用品まとめ買い" },
        { usd: 70, item: "インターネット代 1ヶ月分" },
        { usd: 80, item: "スマホ代 1ヶ月分" },
        { usd: 90, item: "ガス代 1ヶ月分" },
        { usd: 100, item: "光熱費 1ヶ月分" },
        { usd: 120, item: "定期券 1ヶ月分" },
        { usd: 150, item: "食費 1週間分" },
        { usd: 180, item: "生活必需品詰め合わせ" },
        { usd: 200, item: "Claude Max 1ヶ月分" },
        { usd: 250, item: "自転車メンテナンス一式" },
        { usd: 300, item: "家賃の一部" },
        { usd: 400, item: "年間保険料÷12" },
        { usd: 500, item: "引っ越し初期費用の一部" },
        { usd: 600, item: "家具1点" },
        { usd: 800, item: "家電1点" },
        { usd: 1000, item: "生活費1ヶ月分の一部" },
        { usd: 1500, item: "敷金の一部" },
        { usd: 2000, item: "引っ越し費用" },
        { usd: 3000, item: "家賃 1ヶ月分" },
        { usd: 5000, item: "生活立ち上げ資金" }
      ],
      lowUsageMessages: [
        "生活費に余裕あり",
        "まだまだ節約モード",
        "Claude貯金順調",
        "固定費カバーには程遠い",
        "家計簿的には健全",
        "無駄遣いしてない証拠",
        "貯金できそうな使用量"
      ]
    }),
    R: () => ({
      comparisons: [
        { usd: 20, item: "オーガニック野菜セット" },
        { usd: 40, item: "エコ洗剤詰め合わせ" },
        { usd: 60, item: "浄水器カートリッジ" },
        { usd: 80, item: "スマート電球セット" },
        { usd: 100, item: "防災グッズ一式" },
        { usd: 150, item: "高級寝具カバー" },
        { usd: 200, item: "Claude Max 1ヶ月分" },
        { usd: 300, item: "空気清浄機フィルター年間分" },
        { usd: 500, item: "スマートホーム初期投資" },
        { usd: 800, item: "ロボット掃除機" },
        { usd: 1000, item: "高級マットレス" },
        { usd: 2000, item: "全自動コーヒーメーカー" },
        { usd: 5000, item: "ソーラーパネル設置費" }
      ],
      lowUsageMessages: [
        "エコライフ実践中",
        "持続可能な消費を心がけ中",
        "ミニマリスト的使用量",
        "シンプルライフ推進中",
        "断捨離の成果が数値に",
        "必要十分を体現"
      ]
    }),
    SR: () => ({
      comparisons: [
        { usd: 24, item: "24時間営業じゃない店の24時間分" },
        { usd: 52, item: "週1回×52週分の何か" },
        { usd: 100, item: "100均で100個買い" },
        { usd: 123, item: "連番になる公共料金" },
        { usd: 200, item: "Claude Maxという生活必需品" },
        { usd: 365, item: "1日1ドル生活の年間費" },
        { usd: 500, item: "ワンコイン生活（500ドル版）" },
        { usd: 911, item: "緊急時にかける番号分" },
        { usd: 1000, item: "千円札1000枚分の重み" },
        { usd: 2222, item: "2が4つで縁起がいい支出" },
        { usd: 5000, item: "5000兆円欲しい！の0.0000001%" },
        { usd: 9999, item: "カンスト寸前の生活費" }
      ],
      lowUsageMessages: [
        "人生イージーモード",
        "難易度：ベリーイージー",
        "チートコード使用中",
        "無課金プレイヤー",
        "ライフハック効きすぎ",
        "バグ技で生活費削減",
        "裏技使いすぎ注意"
      ]
    })
  }
};

// レアリティが高いほどユニークなメッセージを生成
function enhanceByRarity(baseData, rarity) {
  const data = JSON.parse(JSON.stringify(baseData)); // Deep copy
  
  if (rarity === 'SR' || rarity === 'UR' || rarity === 'LR') {
    // より面白いメッセージを追加
    data.lowUsageMessages = data.lowUsageMessages.map(msg => {
      const prefixes = {
        SR: ['【朗報】', '速報: ', '✨ '],
        UR: ['【超朗報】', '【激レア】', '⭐️ '],
        LR: ['【伝説】', '【神】', '🌟 ']
      };
      const prefix = prefixes[rarity][Math.floor(Math.random() * prefixes[rarity].length)];
      return prefix + msg;
    });
  }
  
  // テンプレートを追加
  data.templates = {
    savingsComparison: "今月は{item}程度の節約 (合計: {totalCost}, 節約: {savings})",
    buffetMode: "Claude Max食べ放題中 ({totalCost})",
    lowUsage: "{message} ({totalCost})",
    highUsageDefault: getHighUsageMessage(rarity)
  };
  
  data.thresholds = {
    savingsComparisonMin: 12,
    buffetModeMin: 0
  };
  
  return data;
}

function getHighUsageMessage(rarity) {
  const messages = {
    N: "もはやスタートアップのサーバー代レベル",
    R: "もはや中小企業のIT予算レベル",
    SR: "もはやユニコーン企業の開発費レベル",
    UR: "もはやGAFAMのAI研究予算レベル",
    LR: "もはや国家予算レベル（嘘）"
  };
  return messages[rarity] || messages.N;
}

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
    
    // 該当するジェネレーターを取得
    const categoryGenerators = generators[request.category];
    if (!categoryGenerators) {
      throw new Error(`Unknown category: ${request.category}`);
    }
    
    const generator = categoryGenerators[request.rarity] || categoryGenerators.N;
    const baseData = generator();
    
    // レアリティに応じて強化
    const enhancedData = enhanceByRarity(baseData, request.rarity);
    
    // レスポンスを書き込み
    fs.writeFileSync(responsePath, JSON.stringify(enhancedData, null, 2));
    
    // リクエストファイルを削除
    fs.unlinkSync(requestPath);
    
    console.log(`✅ Generated ${request.category} ${request.rarity} gacha result`);
  } catch (error) {
    console.error('❌ Error handling gacha request:', error);
  }
}

// ファイル監視モード
function watchMode() {
  console.log('👀 Watching for gacha requests...');
  
  // 初回チェック
  handleGachaRequest();
  
  // 定期的にチェック
  setInterval(() => {
    handleGachaRequest();
  }, 1000);
}

// 単発実行モード
async function singleRun() {
  await handleGachaRequest();
}

// メイン処理
const args = process.argv.slice(2);
if (args.includes('--watch')) {
  watchMode();
} else {
  singleRun();
}