# VRChat謎解きワールド Webアプリケーション

VRChatの謎解きワールドを探索・検索できるWebアプリケーションです。

## 機能

- **ワールド一覧表示**: MongoDBに保存されたVRChatワールドデータを表示
- **タグ検索**: タグによるワールドの絞り込み検索
- **詳細ページ**: 各ワールドの詳細情報表示
- **Google認証**: Googleアカウントでのログイン機能
- **レスポンシブデザイン**: モバイル・デスクトップ対応

## 技術スタック

- **フロントエンド**: Next.js 14, React, TypeScript
- **スタイリング**: Tailwind CSS
- **データベース**: MongoDB Atlas
- **認証**: NextAuth.js (Google OAuth)
- **デプロイ**: Vercel

## 開発環境セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local.example` を `.env.local` にコピーして、以下の値を設定:

```env
MONGODB_URI=your_mongodb_connection_string
MONGODB_DB_NAME=vrcworld

NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_here

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### 3. Google OAuth設定

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを作成
2. OAuth 2.0 クライアントIDを作成
3. 承認済みリダイレクトURIに `http://localhost:3000/api/auth/callback/google` を追加

### 4. 開発サーバー起動

```bash
npm run dev
```

http://localhost:3000 でアプリケーションが起動します。

## Vercelデプロイ

### 1. Vercelプロジェクト作成

```bash
npx vercel
```

### 2. 環境変数設定

Vercelダッシュボードで以下の環境変数を設定:

- `MONGODB_URI`
- `MONGODB_DB_NAME`
- `NEXTAUTH_URL` (本番URL)
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

### 3. Google OAuth本番設定

Google Cloud Consoleで本番URLのリダイレクトURIを追加:
`https://yourdomain.vercel.app/api/auth/callback/google`

## データ構造

MongoDBコレクション `worlds` の想定構造:

```json
{
  "world_id": "wrld_xxx",
  "timestamp": "2025-08-01T00:00:00.000Z",
  "source": "vrchat_api",
  "raw_data": {
    "id": "wrld_xxx",
    "name": "ワールド名",
    "description": "説明",
    "authorName": "制作者",
    "authorId": "usr_xxx",
    "tags": ["tag1", "tag2"],
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z",
    "imageUrl": "https://...",
    "thumbnailImageUrl": "https://...",
    "visits": 1000,
    "favorites": 100,
    "capacity": 32,
    "recommendedCapacity": 16
  }
}
```

## API エンドポイント

- `GET /api/worlds` - ワールド一覧取得
- `GET /api/worlds/[id]` - ワールド詳細取得
- `GET /api/tags` - タグ一覧取得
- `/api/auth/*` - NextAuth.js認証エンドポイント
