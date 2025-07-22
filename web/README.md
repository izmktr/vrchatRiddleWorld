# NazoWeb - TypeScript Frontend

## 概要

`web_old` フォルダの HTML ファイルを TypeScript で再構築した現代的な Web アプリケーションです。

## 技術スタック

- **TypeScript**: 型安全な JavaScript 開発
- **Vite**: 高速な開発サーバーとビルドツール  
- **Vanilla CSS**: カスタムスタイル
- **ES Modules**: モダンなモジュールシステム

## プロジェクト構造

```
web/
├── package.json          # Node.js 依存関係とスクリプト
├── tsconfig.json         # TypeScript 設定
├── vite.config.ts        # Vite 設定
├── index.html            # メインページ
├── manage-worlds.html    # 管理ページ
└── src/
    ├── main.ts           # メインページロジック
    ├── manage.ts         # 管理ページロジック
    ├── types/
    │   └── index.ts      # 型定義
    ├── utils/
    │   └── api.ts        # API クライアント
    └── styles/
        └── main.css      # スタイル
```

## セットアップ

### 1. 依存関係のインストール

```bash
cd web
npm install
```

### 2. 開発サーバーの起動

```bash
npm run dev
```

http://localhost:3000 でアクセス可能

### 3. ビルド

```bash
npm run build
```

`dist/` フォルダに本番用ファイルが生成されます

## 機能

### メインページ (`/`)
- ✅ VRChat ワールド一覧表示
- ✅ グリッドレイアウト
- ✅ 検索・フィルタリング
- ✅ ソート機能
- ✅ ページネーション
- ✅ レスポンシブデザイン

### 管理ページ (`/manage-worlds.html`)  
- ✅ テーブル形式でワールド管理
- ✅ 複数選択・一括選択
- ✅ CSV/JSON エクスポート
- ✅ 詳細な統計情報
- ✅ 管理操作パネル

## API 統合

### 開発環境
- API プロキシ設定済み (`localhost:5000`)
- CORS 対応

### 本番環境 (Vercel)
- 同一オリジンでの API アクセス
- 自動的な URL 切り替え

## 画像対応

### 優先順位
1. **VRChat 公式サムネイル URL** (`thumbnailImageUrl`)
2. **VRChat 元画像 URL** (`imageUrl`) 
3. **外部 URL** (`thumbnail_url`)
4. **ローカルサムネイル** (開発環境のみ)
5. **プレースホルダー** (フォールバック)

## 型安全性

- 🎯 **完全な TypeScript 対応**
- 🔒 **型定義ファイル完備**
- ⚡ **IDE サポート充実**
- 🛡️ **コンパイル時エラー検出**

## パフォーマンス

- ⚡ **Vite の高速ビルド**
- 🗜️ **Tree Shaking 対応**
- 📦 **コードスプリッティング**
- 🎨 **CSS ミニファイ**

## 開発コマンド

```bash
# 開発サーバー
npm run dev

# ビルド
npm run build

# プレビュー
npm run preview

# 型チェック
npm run type-check
```

## 従来版との比較

| 項目 | web_old (HTML) | web (TypeScript) |
|------|---------------|------------------|
| **開発体験** | ❌ ファイル編集 | ✅ TypeScript + Hot Reload |
| **型安全性** | ❌ なし | ✅ 完全対応 |
| **モジュール化** | ❌ 単一ファイル | ✅ ES Modules |
| **ビルド最適化** | ❌ なし | ✅ Vite 最適化 |
| **保守性** | ⚠️ 中程度 | ✅ 高い |

## デプロイ

### Vercel での配信
- `web/` フォルダが静的ファイルとして配信
- `vercel.json` でルーティング設定済み
- 自動的な API プロキシ

### 手動ビルド
```bash
npm run build
# dist/ フォルダを任意のホスティングサービスにアップロード
```

## 今後の拡張計画

- 🔐 **認証機能**
- 📱 **PWA 対応**  
- 🌙 **ダークテーマ**
- 🔍 **高度な検索機能**
- 📊 **データビジュアライゼーション**
- ⚡ **リアルタイム更新**

## トラブルシューティング

### よくある問題

1. **npm install エラー**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **TypeScript エラー**
   ```bash
   npm run type-check
   ```

3. **開発サーバーが起動しない**
   - ポート 3000 が使用中か確認
   - `vite.config.ts` の設定を確認

4. **API 接続エラー**
   - バックエンドサーバーが起動しているか確認
   - CORS 設定を確認
