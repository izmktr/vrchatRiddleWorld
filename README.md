# VRChatワールドスクレイピング & Firebase連携ツール

VRChatワールド情報を自動収集し、Firebaseデータベースに保存して、Webページで表示するプロジェクトです。サムネイル画像のダウンロード機能、2FA認証対応、バッチ処理によるワールド情報の一括取得が可能です。

## 🚀 クイックスタート

```powershell
# 1. 依存関係インストール
pip install -r requirements.txt

# 2. 環境変数設定（.envファイル作成）
VRCHAT_USERNAME=your-username
VRCHAT_PASSWORD=your-password
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_SERVICE_ACCOUNT_PATH=config/firebase-service-account.json

# 3. ワールドURLリスト作成
echo "https://vrchat.com/home/world/wrld_xxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" > vrcworld.txt

# 4. バッチスクレイピング実行（サムネイル画像も自動ダウンロード）
python python/batch_scraper.py --csv

# 5. WebUI確認
python python/app.py
# http://localhost:5000/vrchat_worlds.html にアクセス
```

## ✨ 主要機能

- **🌐 VRChatワールドスクレイピング**: VRChat API経由でワールド詳細情報を収集
- **🖼️ サムネイル画像ダウンロード**: ワールドサムネイル画像の自動ダウンロード・保存
- **🔐 2FA認証対応**: VRChatの二段階認証に対応した安全なログイン
- **📊 Firebase連携**: Firestore NoSQLデータベースへの自動保存
- **🚀 バッチ処理**: 大量のワールドURLを効率的に一括処理
- **📈 進捗表示**: リアルタイムでスクレイピング進捗を表示
- **💾 セッション管理**: 認証状態を保持して効率的な処理を実現
- **📄 CSV出力**: 収集データのCSVエクスポート機能
- **🌐 Web表示**: モダンなWebインターフェースでのデータ表示
- **🛡️ エラーハンドリング**: 堅牢なエラー処理とリトライ機能

## 📁 プロジェクト構造

```
nazoweb/
├── python/                     # 🐍 Pythonスクリプト
│   ├── app.py                  # Flask開発サーバー
│   ├── batch_scraper.py        # バッチ処理メインスクリプト
│   ├── vrchat_auth.py          # VRChat認証モジュール（2FA対応）
│   ├── vrchat_scraper.py       # VRChatワールドスクレイピング
│   ├── firebase_config.py      # Firebase設定と操作
│   ├── scheduler.py            # 定期実行スケジューラー
│   └── scraper.py              # 汎用スクレイピングスクリプト
├── web/                        # 🌐 Webインターフェース
│   ├── index.html              # 一般データ表示用Webページ
│   └── vrchat_worlds.html      # VRChatワールド表示用Webページ
├── config/                     # ⚙️ 設定ファイル
│   ├── firebase-service-account.json  # Firebase認証情報
│   └── vrchat_session.json     # VRChatセッション情報（自動生成）
├── thumbnail/                  # 🖼️ サムネイル画像（自動生成）
│   └── wrld_*.jpg              # ワールドサムネイル画像
├── .vscode/                    # 💻 VS Code設定
│   └── tasks.json              # タスク定義
├── requirements.txt            # Python依存関係
├── .env                        # 環境変数（.env.exampleを参考に作成）
├── vrcworld.txt               # ワールドURLリスト
└── README.md                  # このファイル
```
│   └── vrchat_worlds.html # VRChatワールド表示用Webページ
├── config/
│   └── (Firebase設定ファイル配置場所)
└── .github/
    └── copilot-instructions.md
```

## 🛠️ セットアップ

### 1. Python環境の準備

```powershell
# 仮想環境作成（推奨）
python -m venv .venv
.venv\Scripts\activate

# 依存関係インストール
pip install -r requirements.txt
```

### 2. Firebase設定

1. [Firebase Console](https://console.firebase.google.com/)でプロジェクト作成
2. Firestoreデータベースを有効化（データベース名: `vrcworld` 推奨）
3. サービスアカウントキーをダウンロード
4. `config/firebase-service-account.json`として保存

### 3. 環境変数設定

`.env`ファイルを作成し、以下の設定を追加：

```env
# VRChat認証情報
VRCHAT_USERNAME=your-vrchat-username
VRCHAT_PASSWORD=your-vrchat-password

# Firebase設定
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_SERVICE_ACCOUNT_PATH=config/firebase-service-account.json
FIREBASE_DATABASE_NAME=vrcworld
```

**⚠️ セキュリティ注意事項:**
- VRChatのパスワードは安全に管理してください
- 2FA認証が有効な場合、実行時にワンタイムパスワードの入力が求められます
- セッション情報は`config/vrchat_session.json`に自動保存されます
- `.env`ファイルは絶対にGitにコミットしないでください

### 4. Web設定（オプション）

Webインターフェースを使用する場合、`web/vrchat_worlds.html`のFirebase設定を実際の設定値に変更してください：

```javascript
const firebaseConfig = {
    apiKey: "your-actual-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    // ... その他の設定
};
```

## 🚀 使用方法

### 1. ワールドURLリストの準備

`vrcworld.txt`ファイルにスクレイピングしたいVRChatワールドのURLを1行ずつ記載：

```
https://vrchat.com/home/world/wrld_f8d61b3c-4e25-4c33-813a-dc6d07f8aae6
https://vrchat.com/home/world/wrld_945c28af-bdcf-41b4-b5b4-7d0ff6c77444
```

### 2. バッチ処理でワールド情報を収集

```powershell
# 基本的なバッチ処理（サムネイル画像も自動ダウンロード）
python python/batch_scraper.py

# CSV出力付きでバッチ処理
python python/batch_scraper.py --csv

# カスタムファイルとリクエスト間隔を指定
python python/batch_scraper.py --file custom_worlds.txt --delay 3.0 --csv
```

### 3. VS Codeタスクの使用

VS Codeでプロジェクトを開いている場合、以下のタスクを使用できます：

- **Run Batch Scraper**: バッチ処理を実行
- **Start Flask Server**: Webサーバーを起動
- **Install Dependencies**: 依存関係をインストール

`Ctrl+Shift+P` → `Tasks: Run Task` から選択できます。

### 4. Webインターフェースでデータ確認

```powershell
# Flask開発サーバーを起動
python python/app.py

# ブラウザで以下にアクセス
# http://localhost:5000/vrchat_worlds.html
```

## 📋 出力データ

### 収集される情報

- **ワールドID**: VRChatワールドの一意識別子
- **タイトル**: ワールド名
- **作者**: ワールド作成者
- **説明**: ワールドの説明文
- **定員**: 最大収容人数
- **公開日**: ワールドの公開日時
- **サムネイルURL**: サムネイル画像のURL
- **サムネイル画像**: ローカルにダウンロードされた画像ファイル
- **スクレイピング日時**: データ収集日時

### 出力形式

- **Firebase Firestore**: NoSQLデータベースに構造化データとして保存
- **CSV**: 表形式ファイルとして出力（`--csv`オプション使用時）
- **ログファイル**: 処理詳細ログ（`batch_scraper.log`）

## 🔧 高度な設定

### バッチ処理オプション

```powershell
# リクエスト間隔を3秒に設定（サーバー負荷軽減）
python python/batch_scraper.py --delay 3.0

# カスタムファイルから読み込み
python python/batch_scraper.py --file custom_worlds.txt

# 出力ファイル名を指定
python python/batch_scraper.py --csv --output my_worlds.csv
```

### 2FA認証の処理

### サムネイル画像の管理

- サムネイル画像は`thumbnail/`フォルダに自動保存
- ファイル名: `{world_id}.jpg`
- 既存ファイルがある場合は重複ダウンロードをスキップ
- 画像ファイルは`.gitignore`に含まれ、Gitで追跡されません

## 📊 処理性能とログ

### 実行例

```
🚀 バッチ処理開始: 2 件のワールドをスクレイピングします
⏱️  リクエスト間隔: 2.0 秒

📍 進行状況: 1/2 (50.0%)
🔗 処理中: https://vrchat.com/home/world/wrld_xxxxx...
✅ 成功: Ship Graveyard with Temple Dungeon
👤 作者: Phin
🏠 定員: 32人
🖼️ サムネイル保存完了: wrld_xxxxx.jpg (760,275 bytes)
💾 Firebase保存完了

============================================================
🎉 バッチ処理完了!
✅ 成功: 2 件
❌ 失敗: 0 件
📊 成功率: 100.0%
⏰ 総処理時間: 5.3 秒
⚡ 平均処理時間: 2.7 秒/件
```

### ログ出力

- **進行状況**: リアルタイムで処理状況を表示
- **成功/失敗件数**: 処理完了時に統計情報を表示
- **処理時間**: 総時間と平均時間を計測
- **詳細ログ**: `batch_scraper.log`ファイルに保存
- **統計情報**: 成功率、処理時間、取得データ数の表示
- **重複防止**: 既存データの更新（merge処理）

**初回実行時の流れ:**
1. VRChatにログイン（ユーザー名・パスワード入力）
2. 2FA認証コード入力（有効な場合）
3. ワールドデータの自動収集
4. Firebaseへの自動保存

#### 📊 バッチ処理実行例

```powershell
## 🔍 トラブルシューティング

### よくある問題

#### 1. VRChat認証エラー
```
Error: Authentication failed
```
**解決策:**
- `.env`ファイルの`VRCHAT_USERNAME`と`VRCHAT_PASSWORD`を確認
- 2FA認証が有効な場合、メール認証コードを正しく入力
- セッションファイル`config/vrchat_session.json`を削除して再認証

#### 2. Firebase接続エラー
```
Error: Firebase initialization failed
```
**解決策:**
- `config/firebase-service-account.json`ファイルの存在確認
- Firebase プロジェクトIDが正しく設定されているか確認
- Firestoreデータベースが有効化されているか確認

#### 3. パスエラー
```
FileNotFoundError: vrcworld.txt
```
**解決策:**
- `vrcworld.txt`ファイルがプロジェクトルートに存在するか確認
- ファイル内容がVRChatワールドURLの形式かチェック

#### 4. サムネイルダウンロードエラー
```
サムネイルダウンロードエラー
```
**解決策:**
- `thumbnail/`フォルダの書き込み権限確認
- インターネット接続の確認
- VRChat APIサーバーの状況確認

### デバッグ方法

```powershell
# 詳細ログを確認
Get-Content batch_scraper.log | Select-Object -Last 50

# 特定のワールドのみテスト
echo "https://vrchat.com/home/world/wrld_xxxxx..." > test.txt
python python/batch_scraper.py --file test.txt --csv
```
```

その後、以下にアクセス:
- 一般データ: `http://localhost:8000/index.html`
- VRChatワールド: `http://localhost:8000/vrchat_worlds.html`

## ⚙️ カスタマイズ

### スクレイピング対象の変更

`scraper.py`の`scrape_example_site`メソッドを対象サイトに合わせて修正：

```python
def scrape_example_site(self, url: str) -> Optional[Dict]:
    # 対象サイトに応じてスクレイピングロジックを変更
    # セレクター、要素取得方法などを調整
```

### 実行スケジュールの変更

`scheduler.py`のスケジュール設定を変更：

```python
# 例: 毎日午前9時に実行
schedule.every().day.at("09:00").do(run_scheduled_scraping)

# 例: 毎週月曜日の午前10時に実行
schedule.every().monday.at("10:00").do(run_scheduled_scraping)
```

## 📊 データ構造

Firestoreに保存されるデータ形式：

```json
{
    "url": "https://example.com",
    "title": "ページタイトル",
    "description": "メタ説明",
    "headings": ["見出し1", "見出し2"],
    "scraped_at": "2024-01-01T12:00:00",
## 📄 技術仕様

### 依存関係

主要なPythonライブラリ：

- **requests**: HTTP リクエスト処理
- **beautifulsoup4**: HTML パース
- **firebase-admin**: Firebase Admin SDK
- **google-cloud-firestore**: Firestore データベース
- **python-dotenv**: 環境変数管理
- **flask**: Web開発フレームワーク
- **schedule**: 定期実行スケジューラー

### データベース構造（Firestore）

```javascript
collection: "vrchat_worlds"
document: {
    "world_id": "wrld_xxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "title": "ワールド名",
    "creator": "作者名",
    "description": "ワールドの説明",
    "capacity": "32",
    "thumbnail_url": "https://api.vrchat.cloud/api/1/file/...",
    "thumbnail_path": "thumbnail/wrld_xxxxx.jpg",
    "published": "2023-12-01T10:30:00Z",
    "scraped_at": "2025-07-19T14:03:34.273Z"
}
```

### ファイル構造

- **設定ファイル**: `config/` フォルダに Firebase 認証情報
- **画像ファイル**: `thumbnail/` フォルダに サムネイル画像
- **ログファイル**: プロジェクトルートに処理ログ
- **出力ファイル**: CSV ファイルは プロジェクトルートに生成

## 🤝 貢献

プロジェクトへの貢献を歓迎します！

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/AmazingFeature`)
3. 変更をコミット (`git commit -m 'Add some AmazingFeature'`)
4. ブランチにプッシュ (`git push origin feature/AmazingFeature`)
5. プルリクエストを作成

## � ライセンス

このプロジェクトは MIT ライセンスのもとで公開されています。詳細は `LICENSE` ファイルを参照してください。

## ⚠️ 免責事項

- このツールは教育・研究目的で作成されています
- VRChatの利用規約を遵守してご使用ください
- スクレイピング対象サイトの robots.txt やレート制限を尊重してください
- 取得したデータの利用は自己責任でお願いします

## 🛡️ 注意事項

## ⚠️ 免責事項

- このツールは教育・研究目的で作成されています
- VRChatの利用規約を遵守してご使用ください
- スクレイピング対象サイトの robots.txt やレート制限を尊重してください
- 取得したデータの利用は自己責任でお願いします

---

**Last Updated**: 2025年7月19日  
**Version**: 2.0.0 - サムネイル画像ダウンロード機能、Pythonファイル整理、改良されたバッチ処理

## 🤝 貢献

バグ報告や機能提案は、GitHubのIssuesにお寄せください。
