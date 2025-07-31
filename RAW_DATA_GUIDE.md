# VRChat API生データ保存機能

VRChatのAPI返却値を生データとしてJSONファイルに保存する機能です。

## 機能概要

- VRChat APIからの生データをタイムスタンプ付きJSONファイルで保存
- 生データファイルの一覧表示と詳細確認
- 生データのCSVサマリー出力
- 古いファイルの自動クリーンアップ

## 使用方法

### 1. 生データ保存付きバッチスクレイピング

```bash
# 生データ保存オプション付きでスクレイピング実行
python python/batch_scraper.py --save-raw

# その他のオプションと組み合わせ
python python/batch_scraper.py --save-raw --delay 3.0 --csv
```

**オプション説明:**
- `--save-raw` (`-r`): VRChat API生データをJSONファイルに保存
- `--delay 2.0` (`-d`): リクエスト間隔（秒）
- `--csv` (`-c`): 結果をCSVファイルに出力
- `--file path` (`-f`): URLリストファイル指定
- `--output file.csv` (`-o`): 出力CSVファイル名

### 2. 生データファイル管理

```bash
# 生データファイル一覧表示
python python/raw_data_viewer.py --list

# 特定ファイルの詳細表示
python python/raw_data_viewer.py --show vrchat_raw_wrld_xxxxx_20240730_143022.json

# 生データサマリーをCSV出力
python python/raw_data_viewer.py --export

# 30日より古いファイルを削除
python python/raw_data_viewer.py --cleanup 30
```

**生データ管理オプション:**
- `--list` (`-l`): ファイル一覧表示
- `--show filename` (`-s`): 特定ファイル詳細表示
- `--export` (`-e`): CSVサマリー出力
- `--cleanup days` (`-c`): 古いファイル削除
- `--limit 20`: 一覧表示件数制限
- `--dir path` (`-d`): 生データディレクトリ指定

## ファイル構造

### 保存ディレクトリ
```
nazoweb/
├── raw_data/                    # 生データ保存ディレクトリ
│   ├── vrchat_raw_wrld_xxxxx_20240730_143022.json
│   ├── vrchat_raw_wrld_yyyyy_20240730_143045.json
│   └── ...
```

### 生データファイル形式
```json
{
  "timestamp": "2024-07-30T14:30:22.123456",
  "world_id": "wrld_xxxxx-yyyy-zzzz-aaaa-bbbbbbbbbbbb",
  "source": "vrchat_api",
  "raw_data": {
    "id": "wrld_xxxxx-yyyy-zzzz-aaaa-bbbbbbbbbbbb",
    "name": "ワールド名",
    "authorName": "作者名",
    "description": "ワールドの説明...",
    "capacity": 16,
    "visits": 1000,
    "favorites": 50,
    "popularity": 5,
    "heat": 3,
    "thumbnailImageUrl": "https://...",
    "publicationDate": "2023-05-18T16:09:36.115Z",
    "tags": ["tag1", "tag2"],
    "instances": [...],
    "releaseStatus": "public",
    "authorId": "usr_xxxxx-yyyy-zzzz-aaaa-bbbbbbbbbbbb",
    "recommendedCapacity": 8,
    "labsPublicationDate": "2023-05-18T13:42:35.077Z",
    "version": 121,
    "imageUrl": "https://...",
    "scraped_at": "2024-07-30T14:30:20.123456"
  }
}
```

## 実行例

### バッチスクレイピング（生データ保存付き）
```bash
$ python python/batch_scraper.py --save-raw
🚀 バッチ処理開始: 1 件のワールドをスクレイピングします
📁 生データ保存ディレクトリ: D:\gitproject\nazoweb\raw_data
⏱️  リクエスト間隔: 2.0 秒

📍 進行状況: 1/1 (100.0%)
🔗 処理中: https://vrchat.com/home/world/wrld_47ea5b6b-151c-475f-8114-193fbaa008aa
✅ 成功: Example World
💾 生データ保存: vrchat_raw_wrld_47ea5b6b-151c-475f-8114-193fbaa008aa_20240730_143022.json
📂 生データファイル: vrchat_raw_wrld_47ea5b6b-151c-475f-8114-193fbaa008aa_20240730_143022.json
👤 作者: ExampleUser
🏠 定員: 16人
💾 MongoDB保存完了: wrld_47ea5b6b-151c-475f-8114-193fbaa008aa

============================================================
🎉 バッチ処理完了!
============================================================
✅ 成功: 1 件
❌ 失敗: 0 件
📊 成功率: 100.0%
⏰ 総処理時間: 3.2 秒

📄 生データファイル統計:
・保存ファイル数: 1 件
・保存ディレクトリ: D:\gitproject\nazoweb\raw_data
・最新ファイル: vrchat_raw_wrld_47ea5b6b-151c-475f-8114-193fbaa008aa_20240730_143022.json
============================================================
```

### 生データ一覧表示
```bash
$ python python/raw_data_viewer.py --list
📋 生データファイル一覧 (最新20件 / 全3件)
================================================================================
 1. wrld_47ea5b6b-151c-475f-8114-193fbaa008aa | 20240730_143022 |   15.2KB
 2. wrld_12345678-abcd-efgh-ijkl-mnopqrstuvwx | 20240730_142015 |   14.8KB
 3. wrld_87654321-wxyz-9876-5432-fedcba098765 | 20240730_141003 |   16.1KB
================================================================================
```

### 生データ詳細表示
```bash
$ python python/raw_data_viewer.py --show vrchat_raw_wrld_47ea5b6b-151c-475f-8114-193fbaa008aa_20240730_143022.json
📄 ファイル詳細: vrchat_raw_wrld_47ea5b6b-151c-475f-8114-193fbaa008aa_20240730_143022.json
================================================================================
📅 保存日時: 2024-07-30T14:30:22.123456
🆔 ワールドID: wrld_47ea5b6b-151c-475f-8114-193fbaa008aa
📡 データソース: vrchat_api

🔍 生データ内容:
・ワールド名: Example World
・作者: ExampleUser
・説明: This is an example VRChat world for testing purposes...
・定員: 16
・訪問者数: 1000
・お気に入り数: 50
・人気度: 5
・公開日: 2023-05-18T16:09:36.115Z
・タグ: game, social, fun

📋 利用可能なデータキー:
  id, name, authorName, description, capacity
  visits, favorites, popularity, heat, thumbnailImageUrl
  publicationDate, tags, instances, releaseStatus, authorId
  recommendedCapacity, labsPublicationDate, version, imageUrl, scraped_at
================================================================================
```

## メリット

1. **デバッグ支援**: APIレスポンスの生データを確認可能
2. **データ分析**: 後からAPIレスポンス構造の変化を追跡
3. **バックアップ**: 元データの完全なバックアップ
4. **検証**: データ変換処理の正確性を検証
5. **研究**: VRChat APIの詳細な構造分析

## 注意事項

- 生データファイルは容量が大きくなる可能性があります
- 定期的にクリーンアップを実行することを推奨します
- 個人情報が含まれる可能性があるため、適切に管理してください
