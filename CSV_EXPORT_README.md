# VRChat ワールドデータ CSV エクスポーター

このプログラムは、Firebase に保存されている VRChat ワールドデータを CSV ファイルとしてエクスポートするためのツールです。

## 機能

- **全データエクスポート**: Firebase に保存されている全ての VRChat ワールドデータを CSV に出力
- **人気度順エクスポート**: 人気度順でトップ N 件のワールドを CSV に出力
- **条件付きフィルタリング**: 訪問数、人気度、お気に入り数、作者名、リリースステータスなどの条件でフィルタリング
- **統計情報表示**: データベース内のワールド統計情報を表示

## ファイル構成

- `csv_exporter.py`: メインのエクスポート機能を提供するクラス
- `export_csv.py`: コマンドライン用バッチ処理スクリプト
- `exports/`: CSV ファイルの出力先ディレクトリ（自動作成）

## 依存関係

- `firebase_config.py`: Firebase 接続とデータ取得機能
- Python 標準ライブラリ: `csv`, `logging`, `os`, `datetime`, `argparse`

## 使用方法

### 1. Python スクリプトとして直接実行

```python
from csv_exporter import VRChatWorldCSVExporter

# エクスポーターのインスタンスを作成
exporter = VRChatWorldCSVExporter()

# 全データをエクスポート
filepath = exporter.export_all_worlds_to_csv()

# 人気トップ50をエクスポート
filepath = exporter.export_popular_worlds_csv(top_count=50)

# 条件付きエクスポート（訪問数1000以上）
filepath = exporter.export_worlds_by_criteria(min_visits=1000)

# 統計情報を取得
stats = exporter.get_export_statistics()
```

### 2. コマンドラインから実行

```bash
# 全データをエクスポート
python export_csv.py --all

# 人気トップ100をエクスポート
python export_csv.py --popular 100

# 訪問数1000以上のワールドをエクスポート
python export_csv.py --filter --visits 1000

# 複数条件での絞り込み
python export_csv.py --filter --visits 500 --favorites 100

# 特定作者のワールドのみ
python export_csv.py --filter --author "作者名"

# 公開ワールドのみ
python export_csv.py --filter --status "public"

# 統計情報のみ表示
python export_csv.py --stats

# ファイル名を指定
python export_csv.py --all --filename "my_worlds.csv"

# 詳細ログを非表示
python export_csv.py --all --quiet
```

### 3. コマンドライン引数一覧

#### エクスポートタイプ（必須、いずれか一つ）
- `--all`: 全てのワールドデータをエクスポート
- `--popular N`: 人気度トップN件をエクスポート
- `--filter`: 条件を指定してフィルタリングエクスポート
- `--stats`: 統計情報のみを表示（エクスポートしない）

#### フィルタリング条件
- `--visits N`: 最小訪問数を指定
- `--popularity N`: 最小人気度を指定
- `--favorites N`: 最小お気に入り数を指定
- `--author NAME`: 作者名を指定（部分一致）
- `--status STATUS`: リリースステータスを指定

#### 出力オプション
- `--filename FILENAME`: 出力ファイル名を指定
- `--quiet, -q`: 詳細なログ出力を抑制

## CSV 出力フィールド

エクスポートされる CSV ファイルには以下のフィールドが含まれます：

| フィールド名 | 説明 |
|-------------|------|
| id | ワールドID |
| name | ワールド名 |
| description | ワールドの説明 |
| authorName | 制作者名 |
| authorId | 制作者ID |
| capacity | 最大収容人数 |
| recommendedCapacity | 推奨人数 |
| visits | 訪問数 |
| popularity | 人気度 |
| heat | ヒート値 |
| favorites | お気に入り数 |
| publicationDate | 公開日 |
| labsPublicationDate | ラボ公開日 |
| created_at | 作成日時 |
| updated_at | 更新日時 |
| version | バージョン |
| releaseStatus | リリースステータス |
| platform | プラットフォーム |
| imageUrl | 画像URL |
| thumbnailImageUrl | サムネイル画像URL |
| tags | タグ（カンマ区切り） |
| scraped_at | スクレイピング日時 |
| instances_count | インスタンス数 |

## 出力例

### ファイル名の自動生成

ファイル名を指定しない場合、以下の形式で自動生成されます：

- 全データ: `vrchat_worlds_20250721_143022.csv`
- 人気トップ50: `vrchat_worlds_top50_popularity_20250721_143022.csv`
- 条件付き: `vrchat_worlds_visits1000+_20250721_143022.csv`

### 統計情報の表示例

```
=== VRChatワールドデータ統計 ===
総ワールド数: 1,234
総訪問数: 12,345,678
総お気に入り数: 987,654
平均人気度: 45.67
最大人気度: 89
ユニーク作者数: 456
リリースステータス分布:
  public: 800 件
  hidden: 234 件
  friends: 200 件
```

## エラーハンドリング

- Firebase 接続エラー
- データが見つからない場合
- ファイル書き込みエラー
- 不正な引数エラー

## 注意事項

1. **Firebase 認証**: 事前に `firebase_config.py` が正しく設定されている必要があります
2. **メモリ使用量**: 大量のデータをエクスポートする場合、十分なメモリが必要です
3. **ファイルエンコーディング**: CSV ファイルは UTF-8 BOM 付きで出力されます（Excel 対応）
4. **出力ディレクトリ**: `exports/` ディレクトリが自動作成されます

## トラブルシューティング

### よくある問題

1. **「Firebase 認証エラー」が発生する場合**
   - `config/firebase-service-account.json` が正しく配置されているか確認
   - Firebase プロジェクトの権限設定を確認

2. **「データが見つかりません」と表示される場合**
   - Firebase データベースにワールドデータが保存されているか確認
   - コレクション名が正しく設定されているか確認

3. **CSV ファイルが Excel で文字化けする場合**
   - ファイルは UTF-8 BOM 付きで保存されるため、通常は問題ありません
   - それでも文字化けする場合は、Excel のインポート機能を使用してください

## 使用例とユースケース

### データ分析用途
```bash
# 人気ワールドトップ100を分析用にエクスポート
python export_csv.py --popular 100 --filename "analysis_top100.csv"
```

### バックアップ用途
```bash
# 全データをバックアップ
python export_csv.py --all --filename "backup_$(date +%Y%m%d).csv"
```

### 特定条件でのデータ抽出
```bash
# 人気で活発なワールドのみ
python export_csv.py --filter --visits 5000 --favorites 500 --popularity 50
```

これらのツールを使用して、VRChat ワールドデータを効率的に CSV 形式でエクスポートし、Excel や他の分析ツールで活用することができます。
