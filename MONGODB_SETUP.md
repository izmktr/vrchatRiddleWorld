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
`.env`ファイルを編集：

```env
# MongoDB Atlas接続URI
MONGODB_URI=mongodb+srv://your_username:your_password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority

# データベース名
MONGODB_DB_NAME=nazoweb

# コレクション名
MONGODB_COLLECTION_NAME=vrchat_worlds
```

**重要**: `your_username`と`your_password`を実際の値に置き換えてください。

## 3. 依存関係インストール

```bash
pip install -r requirements.txt
```

主要なMongoDB関連パッケージ：
- `pymongo>=4.6.0` - MongoDB Python driver
- `certifi>=2023.7.22` - SSL証明書検証
- `dnspython>=2.4.2` - SRV記録解決（Atlas必須）

## 4. プログラム実行

### 4.1 バッチスクレイピング（MongoDB版）
```bash
python python/batch_scraper.py
```

オプション：
- `--file vrcworld.txt` - URLリストファイル指定
- `--delay 2.0` - リクエスト間隔（秒）
- `--csv` - CSV出力
- `--output filename.csv` - 出力ファイル名

### 4.2 開発サーバー（MongoDB版）
```bash
python web/dev_server_mongodb.py
```

サーバー起動後、http://localhost:5000 でアクセス可能

## 5. API仕様

### 5.1 エンドポイント一覧
- `GET /api/health` - ヘルスチェック
- `GET /api/stats` - 統計情報
- `GET /api/vrchat_worlds` - ワールド一覧（検索・ソート対応）
- `GET /api/vrchat_worlds/all` - 全ワールド取得
- `GET /api/vrchat_worlds/<world_id>` - 特定ワールド詳細

### 5.2 検索・フィルター
```
GET /api/vrchat_worlds?search=puzzle&sort=popularity&order=desc&page=1&limit=20
```

パラメータ：
- `search` - 検索キーワード（名前、説明文、作者名で検索）
- `sort` - ソート項目（updated_at, popularity, name, visits, favorites, capacity, heat）
- `order` - ソート順（asc, desc）
- `page` - ページ番号
- `limit` - 1ページあたりの件数

## 6. データ構造

### 6.1 MongoDBコレクション
コレクション名: `vrchat_worlds`

### 6.2 ドキュメント構造
```json
{
  "_id": ObjectId,
  "world_id": "wrld_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "name": "ワールド名",
  "title": "ワールドタイトル",
  "authorName": "作者名",
  "description": "ワールド説明",
  "capacity": 16,
  "visits": 1000,
  "favorites": 50,
  "popularity": 5,
  "heat": 3,
  "thumbnailImageUrl": "https://...",
  "publicationDate": "2023-05-18T16:09:36.115Z",
  "tags": ["tag1", "tag2"],
  "updated_at": ISODate,
  "created_at": ISODate,
  "scraped_at": "2023-05-18T16:09:36.115Z"
}
```

### 6.3 インデックス
自動作成されるインデックス：
- `world_id` - 一意インデックス
- テキスト検索用インデックス（name, title, description, authorName）
- `popularity` - 人気度ソート用
- `updated_at` - 更新日時ソート用

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
1. **Indexes**: データ量に応じて追加インデックスを作成
2. **Connection Pooling**: アプリケーション設定で接続プールを最適化
3. **Read Preference**: 読み取り分散設定を検討

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
