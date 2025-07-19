# VRChatワールドスクレイピング機能の使用方法

## 概要
VRChatワールドのページから以下の情報を抽出できます：
- タイトル
- 制作者
- サムネイル画像のURL
- Description
- Capacity（定員）
- Published（公開日）

## 使用方法

### 1. 基本的な使用方法
```bash
python scraper.py --vrchat-url "https://vrchat.com/home/world/wrld_1cc734ca-afb8-490f-8aec-2aab3779bcf5"
```

### 2. 認証情報の設定
VRChatへのログインには認証情報が必要です。以下の手順で設定してください：

1. `.env`ファイルを作成し、以下を記述：
```
VRCHAT_USERNAME=your_vrchat_username
VRCHAT_PASSWORD=your_vrchat_password
```

2. 2FA（二要素認証）が有効な場合、実行時に認証コードの入力が求められます

### 3. 機能の特徴
- **API優先**: 最初にVRChat APIを使用してワールド情報を取得
- **Webスクレイピング**: APIで取得できない場合はWebページから情報を抽出
- **Firebase統合**: 取得したデータを自動的にFirebaseに保存
- **エラーハンドリング**: 接続エラーや認証失敗に対する適切な処理

### 4. 取得できるデータ形式
```json
{
  "world_id": "wrld_1cc734ca-afb8-490f-8aec-2aab3779bcf5",
  "title": "ワールド名",
  "creator": "制作者名",
  "thumbnail_url": "https://example.com/thumbnail.jpg",
  "description": "ワールドの説明",
  "capacity": "20",
  "published": "2023-01-01T00:00:00Z",
  "scraped_at": "2025-07-19T03:00:00Z"
}
```

### 5. 注意事項
- VRChatの利用規約に従って使用してください
- レート制限を考慮し、短時間での大量リクエストは避けてください
- 認証情報は適切に管理してください

### 6. トラブルシューティング
- **403エラー**: User-Agentヘッダーの問題。VRChatが要求する形式を確認してください
- **認証エラー**: ユーザー名、パスワードを確認してください
- **Firebase エラー**: Firebase認証情報が正しく設定されているか確認してください

## 実装されたメソッド
- `scrape_world_by_url(url)`: URLからワールド情報を取得
- `scrape_world_page(world_id)`: ワールドIDからWebページをスクレイピング
- `_extract_world_info(soup, world_id)`: HTMLから情報を抽出
- `_extract_from_json_data(data, world_info)`: JSONデータから情報を抽出
