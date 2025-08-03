# Google OAuth設定ガイド

## 1. Google Cloud Consoleでの設定

### Step 1: プロジェクト作成
1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新しいプロジェクトを作成または既存プロジェクトを選択
3. プロジェクト名：`nazoweb-oauth`（任意）

### Step 2: OAuth同意画面の設定
1. 左側メニュー > **APIs & Services** > **OAuth consent screen**
2. **External** を選択（内部組織がない場合）
3. 必須フィールドを入力：
   - **App name**: `NazoWeb VRChat Explorer`
   - **User support email**: あなたのメールアドレス
   - **Developer contact information**: あなたのメールアドレス
4. **Save and Continue**

### Step 3: OAuth 2.0クライアントIDの作成
1. 左側メニュー > **APIs & Services** > **Credentials**
2. **+ CREATE CREDENTIALS** > **OAuth client ID**
3. **Application type**: **Web application**
4. **Name**: `NazoWeb Client`
5. **Authorized redirect URIs**に以下を追加：
   ```
   http://localhost:3000/api/auth/callback/google
   https://your-vercel-domain.vercel.app/api/auth/callback/google
   ```
6. **CREATE** をクリック
7. **Client ID** と **Client Secret** をコピー（後で使用）

### Step 4: Google+ APIの有効化
1. 左側メニュー > **APIs & Services** > **Library**
2. "Google+ API" を検索
3. **ENABLE** をクリック

## 2. 環境変数設定

### ローカル開発用（.env.local）
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-random-secret-key-here
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### Vercel本番環境用
Vercelの環境変数に以下を追加：
```
NEXTAUTH_URL=https://your-vercel-domain.vercel.app
NEXTAUTH_SECRET=your-random-secret-key-here
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## 3. セキュリティ注意事項

- **NEXTAUTH_SECRET**: `openssl rand -base64 32` で生成可能
- **Client Secret**: 絶対に公開しない
- **Redirect URIs**: 正確なドメインを設定
- **OAuth同意画面**: 必要に応じてプライバシーポリシーを追加

## 4. テスト確認項目

- [ ] ローカル環境でGoogleログインが動作
- [ ] ユーザー情報が正しく取得される
- [ ] ログアウトが正常に動作
- [ ] セッション管理が適切
- [ ] 本番環境でも動作確認

## 5. トラブルシューティング

### よくあるエラー
1. **redirect_uri_mismatch**: Redirect URIが正確に設定されているか確認
2. **invalid_client**: Client IDとSecretが正しいか確認
3. **access_denied**: OAuth同意画面の設定を確認

### デバッグ方法
- ブラウザの開発者ツールでネットワークタブを確認
- NextAuth.jsのデバッグモードを有効化：`NEXTAUTH_DEBUG=true`
