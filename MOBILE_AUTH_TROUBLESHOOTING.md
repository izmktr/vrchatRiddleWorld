# iPhoneサファリでのログイン問題 - トラブルシューティングガイド

## 問題の原因と対策

### 1. Google OAuth設定の確認

**Google Cloud Console での設定:**

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクトを選択
3. 「APIとサービス」→「認証情報」を選択
4. OAuth 2.0 クライアントIDの設定を確認

**承認済みのリダイレクトURIに以下を追加:**
```
# 開発環境用
http://localhost:3000/api/auth/callback/google

# 本番環境用（実際のドメインに置き換え）
https://your-domain.com/api/auth/callback/google
https://your-domain.vercel.app/api/auth/callback/google
```

**承認済みのJavaScriptの生成元に以下を追加:**
```
# 開発環境用
http://localhost:3000

# 本番環境用
https://your-domain.com
https://your-domain.vercel.app
```

### 2. 環境変数の設定確認

**web/.env.local ファイルの例:**
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=vrcworld

# NextAuth設定
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_URL_INTERNAL=http://localhost:3000
NEXTAUTH_SECRET=your-very-secure-random-string-here

# Google OAuth設定
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# 管理者設定
ADMIN_EMAILS=admin@example.com
```

### 3. NextAuthSecretの生成

**セキュアなシークレットを生成:**
```bash
# Node.jsを使用
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# OpenSSLを使用
openssl rand -hex 32
```

### 4. Cookieポリシーの確認

**修正済みの設定:**
- SameSite: 'lax' (Safari対応)
- Secure: 本番環境でのみtrue
- HTTPOnly: セキュリティのためtrue

### 5. iOS Safari特有の問題対策

**実装済みの対策:**
1. **ITP (Intelligent Tracking Prevention) 対応**
   - SameSite=Lax設定
   - 適切なCookieドメイン設定

2. **リダイレクト処理の改善**
   - 安全なリダイレクトコールバック
   - URLバリデーション

3. **モバイル最適化**
   - Viewportメタタグの設定
   - タッチイベントの最適化

### 6. デバッグ方法

**開発環境でのデバッグ:**
```env
# .env.localに追加
NEXTAUTH_DEBUG=true
```

**ブラウザコンソールでの確認:**
```javascript
// サインイン状態の確認
console.log(await import('next-auth/react').then(m => m.getSession()))

// プロバイダー情報の確認
console.log(await import('next-auth/react').then(m => m.getProviders()))
```

### 7. よくある問題と解決法

#### 問題1: "Configuration invalid" エラー
**原因:** Google Client IDまたはSecretの設定ミス
**解決法:** Google Cloud Consoleで認証情報を再確認

#### 問題2: リダイレクトループ
**原因:** NEXTAUTH_URLの設定ミス
**解決法:** 正確なドメイン（http://localhost:3000 または https://yourdomain.com）を設定

#### 問題3: Safari でのみ "Sign in failed" エラー
**原因:** Cookieの制限またはSameSiteポリシー
**解決法:** SameSite=Laxの設定（既に実装済み）

#### 問題4: モバイルでボタンが反応しない
**原因:** タッチイベントの問題
**解決法:** active:クラスの追加（既に実装済み）

### 8. テスト手順

1. **デスクトップChrome**: 正常動作確認
2. **デスクトップSafari**: 動作確認
3. **iPhone Safari**: ログインフロー確認
4. **Android Chrome**: 動作確認

### 9. 本番環境デプロイ時の注意点

**Vercelデプロイ時:**
1. 環境変数の設定確認
2. ドメイン設定の確認
3. Google OAuth設定の更新

**環境変数の設定例:**
```
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_URL_INTERNAL=https://your-app.vercel.app
```

### 10. サポートが必要な場合

以下の情報を収集してください：
1. エラーメッセージ（完全な内容）
2. ブラウザのデベロッパーコンソールのログ
3. 使用しているデバイス・ブラウザの情報
4. 環境変数の設定状況（秘密情報を除く）
