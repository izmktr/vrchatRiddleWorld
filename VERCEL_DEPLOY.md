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
git add .
git commit -m "Add Vercel deployment configuration"
git push origin main
```

## Vercelデプロイ手順

### 1. Vercelアカウント作成・ログイン

1. [Vercel](https://vercel.com/) にアクセス
2. GitHubアカウントでサインアップ/ログイン

### 2. プロジェクトのインポート

1. Vercelダッシュボードで「New Project」をクリック
2. GitHubリポジトリを選択
3. プロジェクト名を設定（例：nazoweb）
4. **Framework Preset**: 「Other」または「Next.js」を選択（Next.js 14以降は自動認識されます）
5. **Root Directory**: 必要に応じて `web` を指定（Next.jsアプリが `web/` ディレクトリの場合）

#### 重要な設定ポイント
- **Build Command**: `web` ディレクトリの場合は `cd web && npm run build` などを指定
- **Output Directory**: `web/.next`
- **Install Command**: `cd web && npm install`
- **API（Python）**: `api/` ディレクトリは自動でServerless Functionsとして認識されます（`vercel.json`でルーティング設定）

### 3. 環境変数の設定

Vercelダッシュボード > Settings > Environment Variables で以下を設定：

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


#### その他の設定
```
PYTHON_VERSION=3.9
```

### 4. デプロイの実行

1. "Deploy" ボタンをクリック
2. ビルドが完了するまで待機（約2-5分）
3. デプロイ完了後、URLが生成される

#### 手動デプロイ（CLI利用時）

1. Vercel CLIをインストール
   ```bash
   npm install -g vercel
   ```
2. ローカルからデプロイ
   ```bash
   vercel --prod
   ```

### 5. GitHub連携・自動デプロイ

- GitHubリポジトリとVercelを連携すると、`main`ブランチへのpushで自動デプロイされます。
- Vercelダッシュボード > Deployments で「Redeploy」ボタンで手動再デプロイも可能です。

## 設定ファイルの説明

### vercel.json
- Vercelのカスタム設定ファイル
- Python APIのルーティングやビルド設定

### api/index.py
- メインAPIエンドポイント（Flaskアプリ）

### api/firebase_config.py
- Firebase設定（環境変数から読み込み）

### api/thumbnail.py
- サムネイル画像提供API

## 利用可能なエンドポイント

- `/` - メインページ（Next.jsアプリケーション）
- `/api/vrchat_worlds` - VRChatワールドデータ
- `/api/vrchat_worlds/all` - 全VRChatワールドデータ
- `/api/stats` - 統計情報
- `/api/health` - ヘルスチェック
- `/thumbnail/<filename>` - サムネイル画像

## トラブルシューティング

- Google OAuthやFirebase接続エラーは環境変数・リダイレクトURI・秘密鍵の改行などを確認
- MongoDB接続エラーはURIやAtlasの設定を確認
- Next.jsビルドエラーは依存関係や型エラーを確認
- Pythonビルドエラーはrequirements.txtやバージョン設定を確認
- サムネイル画像が表示されない場合はthumbnailディレクトリやファイルサイズを確認

## ログの確認

- Vercelダッシュボード > プロジェクト > Functions でエラーログを確認

## セキュリティ注意事項

- Firebase設定は環境変数のみに保存
- .envファイルはGitにコミットしない
- 本番環境ではFirebaseセキュリティルールを必ず設定

## パフォーマンス最適化

- Vercelの関数実行時間制限（30秒）に注意
- 大量データ取得時はページネーション推奨
- 画像最適化の実装を検討

---
2025年8月現在のVercel仕様に合わせて更新
