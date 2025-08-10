# MongoDB Atlas セットアップガイド

このプロジェクトをMongoDB Atlasで動作させるための設定手順です。

## 1. MongoDB Atlas セットアップ

### 1.1 MongoDB Atlasアカウント作成
1. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)にアクセス
2. 無料アカウントを作成
3. 新しいクラスターを作成（無料のM0クラスターで十分）

### 1.2 データベース設定
1. **Database Access**でユーザーを作成
   - ユーザー名とパスワードを設定
   - 権限は「Read and write to any database」を選択

2. **Network Access**でIPアドレスを設定
   - 開発時は「0.0.0.0/0」（すべてのIPアドレス）を許可
   - 本番環境では特定のIPアドレスのみ許可

### 1.3 接続URI取得
1. **Clusters**画面で「Connect」をクリック
2. 「Connect your application」を選択
3. Driver: Python、Version: 4.5 or laterを選択
4. 接続URIをコピー（例：`mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`）

## 2. 環境変数設定

### 2.1 .envファイル作成
`.env.mongodb.example`をコピーして`.env`を作成：

```bash
cp .env.mongodb.example .env
```

### 2.2 MongoDB設定を入力
Webアプリケーション用の`.env.local`ファイルを編集：

**web/.env.local:**
```env
# MongoDB Atlas接続URI
MONGODB_URI=mongodb+srv://your_username:your_password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority

# データベース名
MONGODB_DB_NAME=vrcworld

# NextAuth設定
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_here

# Google OAuth設定
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# 管理者メールアドレス
ADMIN_EMAILS=admin1@example.com,admin2@example.com
```

**API用の.envファイル:**
```env
# MongoDB Atlas接続URI
MONGODB_URI=mongodb+srv://your_username:your_password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority

# データベース名
MONGODB_DB_NAME=vrcworld

# コレクション名（メインワールドデータ）
MONGODB_COLLECTION_NAME=worlds
```

**重要**: `your_username`、`your_password`、その他の値を実際の値に置き換えてください。

## 3. 依存関係インストール

```bash
pip install -r requirements.txt
```

主要なMongoDB関連パッケージ：
- `pymongo>=4.6.0` - MongoDB Python driver
- `certifi>=2023.7.22` - SSL証明書検証
- `dnspython>=2.4.2` - SRV記録解決（Atlas必須）

### 3.1 MongoDB Compass（推奨GUI ツール）

**MongoDB Compass**は、MongoDBの公式GUIツールです。データベースの管理、クエリ実行、インデックス作成を視覚的に行えます。

#### インストール方法
1. [MongoDB Compass](https://www.mongodb.com/products/compass)から無料版をダウンロード
2. インストール後、MongoDB AtlasのConnection Stringで接続

#### 主な機能
- **データ閲覧**: コレクションとドキュメントの表示
- **クエリ実行**: GUIでのクエリ作成・実行
- **インデックス管理**: インデックスの作成・削除・監視
- **スキーマ分析**: データ構造の自動分析
- **パフォーマンス監視**: 実行計画とクエリ性能の分析

#### 接続方法
1. MongoDB Compassを起動
2. 「New Connection」をクリック
3. `.env`ファイルの`MONGODB_URI`をコピー&ペースト
4. 「Connect」をクリック

## 4. アプリケーション実行

### 4.1 Webアプリケーション（Next.js）
```bash
cd web
npm install
npm run dev
```

開発サーバー起動後、http://localhost:3000 でアクセス可能

### 4.2 バッチ処理（Python）

**依存関係のインストール:**
```bash
pip install -r requirements.txt
```

**スクレイピング実行:**
```bash
# 単発実行
python python/download_vrcworld.py

# Firebase/MongoDBアップロード
python python/upload_mongodb.py
```

### 4.3 API サーバー（Vercel/Flask）
```bash
# ローカル開発用
cd api
python index.py
```

API起動後、http://localhost:5000 でアクセス可能

## 5. API仕様（現在の環境）

### 5.1 Next.js API エンドポイント
- `GET /api/worlds` - ワールド一覧（検索・ソート・ページング対応）
- `GET /api/worlds/[id]` - 特定ワールド詳細
- `GET /api/tags` - タグ一覧
- `GET /api/admin/worlds` - 管理者用ワールド管理
- `POST /api/user-world-info/[worldId]` - ユーザーステータス更新

### 5.2 検索・フィルター（Next.js API）
```
GET /api/worlds?page=1&limit=12&tag=puzzle&search=maze&author=phi16&sort=visits&userStatus=5
```

**パラメータ:**
- `page` - ページ番号（デフォルト: 1）
- `limit` - 1ページあたりの件数（デフォルト: 12）
- `tag` - タグフィルター（システムタグID）
- `search` - 検索キーワード（名前・説明・作者名で検索）
- `author` - 制作者フィルター
- `sort` - ソート項目（updated_at, created_at, visits, favorites）
- `userStatus` - ユーザーステータス（0-5, all）

### 5.3 Vercel API エンドポイント
- `GET /api/vrchat_worlds` - ワールド一覧（制限付き）
- `GET /api/vrchat_worlds/all` - 全ワールド取得
- `GET /api/stats` - 統計情報
- `GET /api/world/<world_id>` - 特定ワールド詳細
- `GET /api/health` - ヘルスチェック

### 5.4 Vercel API 使用例
```
GET /api/vrchat_worlds?limit=100
```

**パラメータ:**
- `limit` - 取得件数制限（デフォルト: 100）

## 6. データ構造（現在の環境）

### 6.1 MongoDBデータベース構成
- **データベース名**: `vrcworld`
- **主要コレクション**:
  - `worlds` - VRChatワールドデータ
  - `user_world_info` - ユーザーごとのワールド状態
  - `worlds_tag` - ワールドとタグの関連付け
  - `system_taglist` - システムタグマスター

### 6.2 コレクション別データ構造

#### worldsコレクション
```json
{
  "_id": ObjectId,
  "world_id": "wrld_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "id": "wrld_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "name": "ワールド名",
  "authorName": "作者名",
  "description": "ワールド説明",
  "capacity": 64,
  "recommendedCapacity": 32,
  "visits": 26982,
  "favorites": 3176,
  "popularity": 6,
  "heat": 4,
  "imageUrl": "https://api.vrchat.cloud/api/1/file/...",
  "thumbnailImageUrl": "https://api.vrchat.cloud/api/1/image/...",
  "publicationDate": "2023-05-18T16:09:36.115Z",
  "labsPublicationDate": "2023-05-18T13:42:35.077Z",
  "releaseStatus": "public",
  "tags": ["system_approved"],
  "created_at": "2023-04-02T09:33:34.033Z",
  "updated_at": "2023-12-25T09:17:20.641Z",
  "scraped_at": "2025-08-05T07:13:20.452690",
  "source_url": "https://vrchat.com/home/world/wrld_..."
}
```

#### user_world_infoコレクション
```json
{
  "_id": ObjectId,
  "user_id": "user@example.com",
  "world_id": "wrld_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "status": 5,
  "cleartime": "2025-08-10T12:00:00.000Z",
  "vote": 4,
  "created_at": ISODate,
  "updated_at": ISODate
}
```

**ステータス値の定義:**
- 0: 未選択
- 1: 未訪問
- 2: 注目
- 3: 挑戦中
- 4: 断念
- 5: クリア

#### worlds_tagコレクション
```json
{
  "_id": ObjectId,
  "worldId": "wrld_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "tagId": ObjectId("tag_id_here")
}
```

#### system_taglistコレクション
```json
{
  "_id": ObjectId,
  "tagName": "puzzle",
  "tagDescription": "パズル要素のあるワールド"
}
```

### 6.3 インデックス設定（現在の環境用）

#### 使用されるコレクション
1. **worlds** - ワールドデータ（メインコレクション）
2. **user_world_info** - ユーザーごとのワールド状態管理
3. **worlds_tag** - ワールドとタグの関連付け
4. **system_taglist** - システムタグマスター

#### 基本インデックス（自動作成）
- `_id` - プライマリキー（全コレクション）

#### インデックス設定（優先度順）

**Step 1: 必須インデックス（最優先）**
```javascript
// worlds コレクション - 基本検索用
db.worlds.createIndex({ "world_id": 1 }, { unique: true })  // 一意制約
db.worlds.createIndex({ "updated_at": -1 })                // デフォルトソート（最重要）

// user_world_info コレクション - ユーザーステータス検索用
db.user_world_info.createIndex({ "user_id": 1, "status": 1 })
db.user_world_info.createIndex({ "user_id": 1, "world_id": 1 }, { unique: true })

// worlds_tag コレクション - タグフィルター用
db.worlds_tag.createIndex({ "tagId": 1 })
db.worlds_tag.createIndex({ "worldId": 1 })
```

**Step 2: パフォーマンス向上インデックス（高優先度）**
```javascript
// worlds コレクション - ソート・フィルター用
db.worlds.createIndex({ "visits": -1 })                    // 訪問数ソート
db.worlds.createIndex({ "favorites": -1 })                 // お気に入り数ソート
db.worlds.createIndex({ "created_at": -1 })                // 作成日ソート
db.worlds.createIndex({ "authorName": 1 })                 // 制作者フィルター

// user_world_info コレクション - 追加検索用
db.user_world_info.createIndex({ "world_id": 1 })
db.user_world_info.createIndex({ "status": 1 })

// worlds_tag コレクション - 複合検索用
db.worlds_tag.createIndex({ "tagId": 1, "worldId": 1 }, { unique: true })

// system_taglist コレクション - タグ名検索用
db.system_taglist.createIndex({ "tagName": 1 })
```

**Step 3: 複合インデックス（中優先度）**
```javascript
// 複数条件での検索最適化用
db.worlds.createIndex({ "authorName": 1, "updated_at": -1 })
db.worlds.createIndex({ "world_id": 1, "updated_at": -1 })
db.worlds.createIndex({ "popularity": -1 })                // 人気度ソート
```

**Step 4: 検索用インデックス（オプション）**
```javascript
// 全文検索用（現在の検索機能に対応）
db.worlds.createIndex({
  "name": "text",
  "description": "text",
  "authorName": "text"
}, {
  weights: {
    "name": 10,
    "authorName": 5,
    "description": 1
  },
  name: "search_index"
})
```

#### インデックス作成の実行手順

**MongoDB Compass を使用（推奨）:**
1. MongoDB Compassを開く
2. データベース`vrcworld`を選択
3. 各コレクション（worlds, user_world_info, worlds_tag, system_taglist）を選択
4. 「Indexes」タブをクリック
5. 「CREATE INDEX」ボタンをクリック
6. 上記のインデックスを順番に作成

**作成優先度の説明:**
- **Step 1（必須）**: アプリケーション動作に必要な最低限のインデックス
- **Step 2（高優先度）**: パフォーマンス向上に大きく貢献するインデックス
- **Step 3（中優先度）**: 複合クエリの最適化用インデックス
- **Step 4（オプション）**: 検索機能の向上用（データサイズが大きい場合に推奨）

**Mongo Shell 一括実行用コマンド:**
```bash
# MongoDB Atlas接続後
use vrcworld

# Step 1: 必須インデックス（最優先）
db.worlds.createIndex({ "world_id": 1 }, { unique: true })
db.worlds.createIndex({ "updated_at": -1 })
db.user_world_info.createIndex({ "user_id": 1, "status": 1 })
db.user_world_info.createIndex({ "user_id": 1, "world_id": 1 }, { unique: true })
db.worlds_tag.createIndex({ "tagId": 1 })
db.worlds_tag.createIndex({ "worldId": 1 })

# Step 2: パフォーマンス向上用（推奨）
db.worlds.createIndex({ "visits": -1 })
db.worlds.createIndex({ "favorites": -1 })
db.worlds.createIndex({ "created_at": -1 })
db.worlds.createIndex({ "authorName": 1 })
db.user_world_info.createIndex({ "world_id": 1 })
db.user_world_info.createIndex({ "status": 1 })
db.worlds_tag.createIndex({ "tagId": 1, "worldId": 1 }, { unique: true })
db.system_taglist.createIndex({ "tagName": 1 })

# Step 3: 複合インデックス（必要に応じて）
db.worlds.createIndex({ "authorName": 1, "updated_at": -1 })
db.worlds.createIndex({ "world_id": 1, "updated_at": -1 })
db.worlds.createIndex({ "popularity": -1 })

# Step 4: テキスト検索用（オプション）
db.worlds.createIndex({
  "name": "text",
  "description": "text",
  "authorName": "text"
}, {
  weights: { "name": 10, "authorName": 5, "description": 1 },
  name: "search_index"
})
```

## 7. トラブルシューティング

### 7.1 接続エラー
```
ConnectionFailure: [SSL: CERTIFICATE_VERIFY_FAILED]
```
**解決方法**: `pip install certifi`でSSL証明書を更新

### 7.2 認証エラー
```
OperationFailure: Authentication failed
```
**解決方法**: 
1. MongoDB Atlasのユーザー名・パスワードを確認
2. Database Accessでユーザー権限を確認
3. `.env`ファイルの`MONGODB_URI`を確認

### 7.3 ネットワークエラー
```
ServerSelectionTimeoutError
```
**解決方法**:
1. Network AccessでIPアドレスが許可されているか確認
2. ファイアウォール設定を確認
3. インターネット接続を確認

## 8. 本番環境設定

### 8.1 セキュリティ設定
1. **Network Access**: 本番サーバーのIPアドレスのみ許可
2. **Database Users**: 最小権限の原則に従ってユーザー権限を設定
3. **Environment Variables**: 環境変数は安全に管理

### 8.2 パフォーマンス最適化

#### インデックス管理とメンテナンス

**インデックス使用状況の確認:**
```javascript
// インデックス一覧確認
db.worlds.getIndexes()
db.user_world_info.getIndexes()
db.worlds_tag.getIndexes()
db.system_taglist.getIndexes()

// インデックス使用統計
db.runCommand({ collStats: "worlds" })

// クエリ実行計画確認（例）
db.worlds.find({ "updated_at": { $lt: new Date() } }).explain("executionStats")
```

**不要インデックスの削除:**
```javascript
// インデックス削除（例）
db.worlds.dropIndex("index_name")

// 全インデックス削除（_id以外）
db.worlds.dropIndexes()
```

#### その他の最適化設定
1. **Connection Pooling**: アプリケーション設定で接続プールサイズを調整
2. **Read Preference**: 読み取り分散設定を検討
3. **Write Concern**: 書き込み要求レベルの最適化
4. **MongoDB Atlas**: 適切なクラスターサイズの選択

## 9. 移行作業

### 9.1 Firebaseからの移行
1. Firebaseからデータをエクスポート
2. MongoDBにデータをインポート
3. アプリケーションコードを更新
4. テスト実行

### 9.2 データ移行スクリプト
```bash
# Firebase データエクスポート
python python/export_firebase_to_mongodb.py

# MongoDB インポート検証
python python/verify_mongodb_data.py
```

## 10. その他

### 10.1 ログ設定
ログファイル: `batch_scraper.log`

### 10.2 CSV エクスポート
```bash
python python/batch_scraper.py --csv --output vrchat_worlds.csv
```

### 10.3 定期実行
スケジューラーでの定期実行設定：
```bash
python python/scheduler_mongodb.py
```
