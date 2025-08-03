# NazoWeb - Vercelデプロイガイド

このプロジェクトをVercelにデプロイする手順を説明します。

## 事前準備

### 1. Firebaseの設定

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. プロジェクトを作成または選択
3. Firestoreデータベースを有効化
4. プロジェクト設定 > サービスアカウント > 新しい秘密鍵の生成
5. ダウンロードしたJSONファイルを保存（後で使用）

### 2. GitHubリポジトリの準備

```bash
# リポジトリをGitHubにプッシュ
git add .
git commit -m "Add Vercel deployment configuration"
git push origin main
```

## Vercelデプロイ手順

### 1. Vercelアカウント作成・ログイン

1. [Vercel](https://vercel.com/) にアクセス
2. GitHubアカウントでサインアップ/ログイン

### 2. プロジェクトのインポート

1. Vercelダッシュボードで "New Project" をクリック
2. GitHubリポジトリを選択
3. プロジェクト名を設定（例：nazoweb）
4. **Framework Preset**: "Other" を選択（カスタム構成のため）
5. **Build and Output Settings**: そのまま（変更不要）
6. **Root Directory**: そのまま（変更不要）

#### ⚠️ 重要な設定ポイント
- **Framework Settings**: **空のまま**（何も入力しない）
- **Build Command**: 自動入力されても**削除して空にする**
- **Output Directory**: 自動入力されても**削除して空にする**
- **Install Command**: 自動入力されても**削除して空にする**

理由：プロジェクトは`vercel.json`でカスタム設定を使用するため、フレームワークの自動設定は不要です。

**デプロイ対象**: このプロジェクトは**ハイブリッド構成**です：

- **Backend**: Python Flask API（`api/`フォルダ）
- **Frontend**: Next.js 14 + TypeScript（`web/`フォルダ）
- **Build**: `vercel.json`で両方を統合してデプロイ

### 3. 環境変数の設定

**Settings > Environment Variables** で以下を設定：

#### MongoDB設定（必須）
```
MONGODB_URI=mongodb+srv://your-username:your-password@your-cluster.mongodb.net/your-database?retryWrites=true&w=majority
```

#### Google OAuth設定（必須）
```
NEXTAUTH_URL=https://your-vercel-domain.vercel.app
NEXTAUTH_SECRET=your-generated-secret-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

#### Firebase設定（必須）
```
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour-private-key\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your-service-account-email@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/your-service-account-email%40your-project.iam.gserviceaccount.com
```

#### その他の設定
```
PYTHON_VERSION=3.9
```

### 4. デプロイの実行

1. "Deploy" ボタンをクリック
2. ビルドが完了するまで待機（約2-5分）
3. デプロイ完了後、URLが生成される

## 設定ファイルの説明

### vercel.json
- Vercelの設定ファイル
- Python関数のルーティング設定
- ビルド設定

### api/index.py
- メインのAPIエンドポイント
- Flask アプリケーション
- VRChatワールドデータのAPI

### api/firebase_config.py
- Vercel用Firebase設定
- 環境変数からの設定読み込み

### api/thumbnail.py
- サムネイル画像提供API

## 利用可能なエンドポイント

デプロイ後、以下のエンドポイントが利用可能：

- `/` - メインページ（Next.jsアプリケーション）
- `/api/vrchat_worlds` - VRChatワールドデータ（制限付き、デフォルト100件）
- `/api/vrchat_worlds/all` - 全VRChatワールドデータ
- `/api/stats` - 統計情報
- `/api/health` - ヘルスチェック
- `/thumbnail/<filename>` - サムネイル画像

## トラブルシューティング

### よくある問題

1. **Google OAuth接続エラー**
   - NEXTAUTH_URLが本番URLに設定されているか確認
   - Google Cloud ConsoleのAuthorized redirect URIsが正しく設定されているか確認
   - NEXTAUTH_SECRETが設定されているか確認

2. **Firebase接続エラー**
   - 環境変数が正しく設定されているか確認
   - FIREBASE_PRIVATE_KEYの改行文字が適切か確認

3. **MongoDB接続エラー**
   - MONGODB_URIが正しく設定されているか確認
   - MongoDB Atlasのネットワークアクセス設定を確認

4. **Next.jsビルドエラー**
   - web/package.jsonの依存関係を確認
   - TypeScriptの型エラーがないか確認

5. **ビルドエラー**
   - requirements.txtの依存関係を確認
   - Python バージョンが3.9に設定されているか確認

6. **サムネイル画像が表示されない**
   - thumbnailディレクトリがリポジトリに含まれているか確認
   - 画像ファイルサイズが制限内か確認

### ログの確認

1. Vercelダッシュボード > プロジェクト > Functions
2. エラーログを確認

### 再デプロイ

コードを更新した場合：
```bash
git add .
git commit -m "Update code"
git push origin main
```

Vercelが自動的に再デプロイを実行します。

## セキュリティ注意事項

- Firebase設定は環境変数のみに保存
- .envファイルは絶対にGitにコミットしない
- 本番環境では適切なFirebaseセキュリティルールを設定

## パフォーマンス最適化

- Vercelの関数実行時間制限（30秒）に注意
- 大量データ取得時はページネーション推奨
- 画像最適化の実装を検討
