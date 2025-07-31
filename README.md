# VRChatワールドデータ管理システム

VRChatのワールドデータをダウンロード・保存・アップロードするためのPythonシステムです。

## 📁 プロジェクト構造

```
nazoweb/
├── python/                   # メインプログラムフォルダ
│   ├── download_vrcworld.py  # VRChatワールドダウンローダー
│   ├── upload_mongodb.py     # MongoDB Atlasアップローダー
│   ├── upload_firebase.py    # Firebaseアップローダー
│   └── lib/                  # ライブラリフォルダ
│       ├── vrchat_scraper.py # VRChatスクレイピングライブラリ
│       ├── mongodb_manager.py # MongoDB管理ライブラリ
│       ├── firebase_manager.py # Firebase管理ライブラリ
│       └── utils.py          # 共通ユーティリティ
├── vrcworld.txt              # ワールドURLリスト
├── .env                      # 環境変数設定
├── requirements.txt          # Python依存関係
├── thumbnail/                # サムネイル画像保存フォルダ
├── raw_data/                 # 生データJSONファイル保存フォルダ
└── exports/                  # CSVエクスポートフォルダ
```

## 🚀 使用方法

### 1. 環境設定

```bash
# 依存関係インストール
pip install -r requirements.txt

# 環境変数設定（.envファイルを編集）
# MongoDB URIやFirebase設定を記入
```

### 2. ワールドデータダウンロード

```bash
# VRChatからワールドデータをダウンロード
python python/download_vrcworld.py
```

**機能:**
- `vrcworld.txt`のURLリストからワールドデータを取得
- `thumbnail/`にサムネイル画像を保存（既存ファイルはスキップ）
- `raw_data/`にAPI生データをJSON形式で保存（上書き）

### 3. データベースアップロード

```bash
# MongoDB Atlasにアップロード
python python/upload_mongodb.py

# Firebaseにアップロード
python python/upload_firebase.py
```

**機能:**
- `raw_data/`フォルダの生データファイルを読み込み
- 各データベースの形式に合わせてアップロード
- 重複データは自動で上書き・更新

## 📋 ワールドURLリスト設定

`vrcworld.txt`ファイルに、1行につき1つのVRChatワールドURLを記入：

```
https://vrchat.com/home/world/wrld_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
https://vrchat.com/home/world/wrld_yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy
```

## ⚙️ 環境変数設定

`.env`ファイルで以下を設定：

```env
# MongoDB Atlas設定
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=vrcworld
MONGODB_COLLECTION_NAME=worlds

# Firebase設定
FIREBASE_SERVICE_ACCOUNT_PATH=config/firebase-service-account.json
FIREBASE_PROJECT_ID=your-project-id
```

## 📊 データ形式

### 生データファイル（JSON）
```json
{
  "timestamp": "2024-07-31T00:00:00.000000",
  "world_id": "wrld_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "source": "vrchat_api",
  "raw_data": {
    "id": "wrld_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "name": "ワールド名",
    "authorName": "作者名",
    "description": "ワールド説明",
    "capacity": 16,
    "visits": 1000,
    "favorites": 50,
    "popularity": 5,
    "thumbnailImageUrl": "https://...",
    "publicationDate": "2023-01-01T00:00:00.000Z",
    "tags": ["tag1", "tag2"],
    "scraped_at": "2024-07-31T00:00:00.000000"
  }
}
```

### サムネイル画像
- ファイル名: `{world_id}.jpg`
- 形式: JPEG
- 保存先: `thumbnail/`フォルダ

## 🔄 処理フロー

1. **ダウンロード段階**
   - `vrcworld.txt` → VRChat API → `raw_data/` + `thumbnail/`

2. **アップロード段階**
   - `raw_data/` → MongoDB Atlas または Firebase

## 📝 ログ・エラー処理

- リアルタイムで進行状況を表示
- エラー発生時も処理を継続
- 処理完了時に統計情報を表示
- レート制限対応（2秒間隔でリクエスト）

## 💡 特徴

- **モジュール化**: python/フォルダに整理された構造
- **ライブラリ分離**: 共通機能はlibフォルダに分離
- **重複回避**: サムネイルはスキップ、生データは上書き
- **エラー耐性**: 一部失敗しても全体処理を継続
- **統計表示**: 処理結果を詳細に表示

## 🛠️ 依存関係

主要パッケージ:
- `requests` - HTTP通信
- `beautifulsoup4` - HTMLパース
- `pymongo` - MongoDB操作
- `firebase-admin` - Firebase操作
- `python-dotenv` - 環境変数管理

## 📖 その他のドキュメント

- `MONGODB_SETUP.md` - MongoDB Atlas詳細設定
- `RAW_DATA_GUIDE.md` - 生データ活用ガイド
- `VERCEL_DEPLOY.md` - Vercelデプロイ手順
