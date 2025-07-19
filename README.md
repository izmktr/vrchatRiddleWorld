# ウェブスクレイピング & Firebase連携ツール

PythonでWebサイトをスクレイピングし、収集したデータをFirebaseに保存して、Webページで表示するプロジェクトです。

## 🚀 クイックスタート（VRChatワールドスクレイピング）

```powershell
# 1. 依存関係インストール
pip install -r requirements.txt

# 2. 環境変数設定（.envファイル作成）
VRCHAT_USERNAME=your-username
VRCHAT_PASSWORD=your-password
FIREBASE_PROJECT_ID=your-project-id

# 3. ワールドURLリスト作成
echo "https://vrchat.com/home/world/wrld_76ff519f-c4fa-4c7d-8ed0-65ae3a50f1e8" > vrcworld.txt

# 4. バッチスクレイピング実行
python batch_scraper.py --csv

# 5. WebUI確認
python app.py
# http://localhost:5000/vrchat_worlds.html にアクセス
```

## 🚀 機能

- **ウェブスクレイピング**: BeautifulSoup4とrequestsを使用したWebデータ収集
- **VRChatワールドスクレイピング**: VRChat API経由でワールドデータを収集
- **Firebase連携**: Firestore NoSQLデータベースへの自動保存
- **Web表示**: モダンなWebインターフェースでのデータ表示
- **定期実行**: スケジューラーによる自動データ収集
- **認証対応**: VRChatログイン + 2FA認証
- **CSV出力**: 収集データのCSVエクスポート機能

## 📁 プロジェクト構造

```
nazoweb/
├── scraper.py              # メインスクレイピングスクリプト
├── vrchat_auth.py          # VRChat認証モジュール
├── vrchat_scraper.py       # VRChatワールドスクレイピング
├── firebase_config.py      # Firebase設定と操作
├── scheduler.py            # 定期実行スケジューラー
├── app.py                  # Flask開発サーバー
├── requirements.txt        # Python依存関係
├── .env.example           # 環境変数サンプル
├── web/
│   ├── index.html         # 一般データ表示用Webページ
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
python -m venv venv
venv\Scripts\activate

# 依存関係インストール
pip install -r requirements.txt
```

### 2. Firebase設定

1. [Firebase Console](https://console.firebase.google.com/)でプロジェクト作成
2. Firestoreデータベースを有効化
3. サービスアカウントキーをダウンロード
4. `config/firebase-service-account.json`として保存

### 3. VRChat認証設定

VRChatアカウントの認証情報を`.env`ファイルに追加：

```env
VRCHAT_USERNAME=your-vrchat-username
VRCHAT_PASSWORD=your-vrchat-password
```

**⚠️ セキュリティ注意事項:**
- VRChatのパスワードは安全に管理してください
- 2FA認証が有効な場合、実行時にワンタイムパスワードの入力が求められます
- セッション情報は`config/vrchat_session.json`に保存されます

### 4. Web設定

`web/index.html`のFirebase設定を実際の設定値に変更してください：

```javascript
const firebaseConfig = {
    apiKey: "your-actual-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    // ... その他の設定
};
```

## 🚀 使用方法

### 通常のWebスクレイピング

```powershell
# 一般的なWebサイトのスクレイピング
python scraper.py
```

### VRChatワールドスクレイピング

```powershell
# 人気ワールド20件を取得
python scraper.py --vrchat --count 20

# フィーチャーワールドを取得
python scraper.py --vrchat --featured

# キーワード検索
python scraper.py --vrchat --keyword "avatar" --count 30

# ファイルからワールドURLを一括処理
python batch_scraper.py --csv

# または個別にファイル指定
python vrchat_scraper.py --batch-file vrcworld.txt
```

### 📁 ファイルからのバッチスクレイピング

複数のVRChatワールドを一括処理する場合の手順：

#### 1. ワールドURLリストファイルの準備

`vrcworld.txt`ファイルを作成し、1行につき1つのVRChatワールドURLを記載：

```
https://vrchat.com/home/world/wrld_76ff519f-c4fa-4c7d-8ed0-65ae3a50f1e8
https://vrchat.com/home/world/wrld_4432ea9b-729c-46e3-8f95-18f17580181f
https://vrchat.com/home/world/wrld_a61cdabe-1d89-4b5c-a826-ab1478a53c54
```

#### 2. バッチ処理の実行

```powershell
# CSVファイル出力付きでバッチ処理実行
python batch_scraper.py --csv

# または基本的なバッチ処理
python batch_scraper.py
```

#### 3. 2FA認証対応

**方法A: インタラクティブ入力**
```powershell
python batch_scraper.py --csv
# 2FA認証画面が表示されたら、メールで受信した6桁のコードを入力
```

**方法B: 環境変数での事前設定**
```powershell
# .envファイルに2FAコードを追加
echo "VRCHAT_2FA_CODE=123456" >> .env
python batch_scraper.py --csv
```

**方法C: ヘルパースクリプト使用**
```powershell
# インタラクティブにコードを入力し、.envファイルに自動保存
python vrchat_2fa_helper.py
# その後バッチ処理実行
python batch_scraper.py --csv
```

#### 4. 出力ファイル

バッチ処理完了後、以下のファイルが生成されます：

- **CSVファイル**: `vrchat_worlds_batch_YYYYMMDD_HHMMSS.csv`
  - ワールドID、タイトル、作者、説明、定員、サムネイルURL、取得日時
- **Firestoreデータベース**: リアルタイムでWebUI表示可能
- **ログファイル**: `batch_scraper.log`（詳細な処理ログ）

#### 5. 処理の特徴

- **進行状況表示**: リアルタイムで処理状況を表示
- **エラーハンドリング**: 失敗したURLをスキップして継続
- **レート制限対応**: VRChatのAPI制限を考慮した待機時間
- **統計情報**: 成功率、処理時間、取得データ数の表示
- **重複防止**: 既存データの更新（merge処理）

**初回実行時の流れ:**
1. VRChatにログイン（ユーザー名・パスワード入力）
2. 2FA認証コード入力（有効な場合）
3. ワールドデータの自動収集
4. Firebaseへの自動保存

#### 📊 バッチ処理実行例

```powershell
PS D:\gitproject\nazoweb> python batch_scraper.py --csv
Firebase初期化開始 - Project ID: vrcriddleworld, Database: vrcworld
Firebase Admin SDK初期化完了（サービスアカウント使用、DB: vrcworld）
📁 ファイル 'vrcworld.txt' から 3 件のURLを読み込みました
🚀 バッチ処理開始: 3 件のワールドをスクレイピングします
⏱️  リクエスト間隔: 2.0 秒

📍 進行状況: 1/3 (33.3%)
🔗 処理中: https://vrchat.com/home/world/wrld_76ff519f-c4fa-4c7d-8ed0-65ae3a50f1e8
✅ 成功: Riddles of Nowhere
👤 作者: chak_chak127
🏠 定員: 32人
💾 Firebase保存完了

============================================================
🎉 バッチ処理完了!
============================================================
✅ 成功: 3 件
❌ 失敗: 0 件
📊 成功率: 100.0%
⏰ 総処理時間: 8.5 秒
⚡ 平均処理時間: 2.8 秒/件
📥 CSV出力完了: vrchat_worlds_batch_20250719_040121.csv
```

### 定期実行

```powershell
# スケジューラー開始（1時間ごとに実行）
python scheduler.py
```

### Web表示

1. **一般データ表示**: `web/index.html`をブラウザで開く
2. **VRChatワールド表示**: `web/vrchat_worlds.html`をブラウザで開く
3. または、簡易サーバー起動:

```powershell
cd web
python -m http.server 8000
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
    "content_length": 1500,
    "created_at": "Firestore ServerTimestamp",
    "updated_at": "Firestore ServerTimestamp"
}
```

## 🔧 トラブルシューティング

### よくある問題

1. **Firebase接続エラー**
   - サービスアカウントキーのパスを確認
   - プロジェクトIDが正しいか確認
   - Firestoreデータベースが作成されているか確認（デフォルト名: `(default)`）

2. **スクレイピングエラー**
   - User-Agentヘッダーの設定確認
   - レート制限による待機時間の調整

3. **VRChat 2FA認証エラー**
   - メールで受信した6桁のコードを正確に入力
   - コードの有効期限（通常5-10分）を確認
   - `.env`ファイルの`VRCHAT_2FA_CODE`設定を確認

4. **ファイル読み込みエラー**
   - `vrcworld.txt`ファイルがUTF-8エンコーディングで保存されているか確認
   - ファイル内のURLが正しい形式（`https://vrchat.com/home/world/wrld_...`）か確認
   - 空行や不正な文字が含まれていないか確認

5. **バッチ処理の中断**
   - VRChatのレート制限（429エラー）: 処理間隔を長くする
   - セッション切れ: 再認証が自動実行される
   - ネットワークエラー: 失敗したURLは後で再実行可能

6. **Web表示でデータが表示されない**
   - Firebase Web設定の確認
   - ブラウザの開発者ツールでエラーチェック
   - Firestoreのセキュリティルール確認

### ログファイル

- `scraper.log`: スクレイピング実行ログ
- `scheduler.log`: スケジューラー実行ログ
- `batch_scraper.log`: バッチ処理実行ログ
- VRChatセッション: `config/vrchat_session.json`（自動生成）

### 📁 関連ファイル

- `vrcworld.txt`: VRChatワールドURLリスト（バッチ処理用）
- `vrchat_worlds_batch_*.csv`: バッチ処理結果のCSVファイル
- `.env`: 環境変数設定（認証情報、2FAコードなど）

## 🛡️ 注意事項

- **robots.txt**: 対象サイトのrobots.txtを必ず確認
- **レート制限**: サイトに負荷をかけないよう適切な間隔で実行
- **利用規約**: 各サイトの利用規約を遵守
- **個人情報**: 個人情報の収集は避ける
- **著作権**: 著作権に配慮したデータ収集

## 📝 ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## 🤝 貢献

バグ報告や機能提案は、GitHubのIssuesにお寄せください。
