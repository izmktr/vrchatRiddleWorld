# Vercel環境変数設定ガイド

Vercelでデプロイする際は、以下の環境変数をVercelのダッシュボードで設定してください：

## 必須環境変数

### MongoDB設定
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
MONGODB_DB_NAME=vrcworld
```

### NextAuth.js設定
```
NEXTAUTH_URL=https://your-app-name.vercel.app
NEXTAUTH_SECRET=your-random-secret-string
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
ADMIN_EMAILS=admin1@example.com,admin2@example.com
```

### Firebase Admin SDK設定
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

### その他の設定
```
PYTHON_VERSION=3.9
```

## 設定方法

1. Vercelダッシュボードにアクセス
2. プロジェクトを選択
3. Settings > Environment Variables
4. 上記の環境変数を一つずつ追加

## Firebase設定の取得方法

1. Firebase Console (https://console.firebase.google.com/) にアクセス
2. プロジェクト設定 > サービスアカウント
3. "新しい秘密鍵の生成" をクリック
4. ダウンロードしたJSONファイルから各値をコピーして環境変数に設定

## MongoDB設定の取得方法

1. MongoDB Atlas (https://cloud.mongodb.com/) にアクセス
2. Database > Connect > Drivers
3. 接続文字列をコピーしてMONGODB_URIに設定
4. データベース名をMONGODB_DB_NAMEに設定

## Google OAuth設定の取得方法

1. Google Cloud Console (https://console.cloud.google.com/) にアクセス
2. APIs & Services > Credentials
3. OAuth 2.0 クライアント ID を作成
4. 承認済みリダイレクト URI に `https://your-app-name.vercel.app/api/auth/callback/google` を追加
5. クライアントIDとクライアントシークレットを環境変数に設定

## NEXTAUTH_SECRET生成方法

```bash
openssl rand -base64 32
```

## 注意事項

- FIREBASE_PRIVATE_KEYには改行文字(\n)を含む完全な秘密鍵を設定してください
- 全ての値は文字列として設定してください
- 機密情報なので絶対にGitにコミットしないでください
