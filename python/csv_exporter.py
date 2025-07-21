"""
Firebase VRChatワールドデータをCSVでエクスポートするプログラム
"""

import csv
import logging
import os
from typing import List, Dict, Optional, Any
from datetime import datetime

from firebase_config import FirebaseManager

# ログ設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class VRChatWorldCSVExporter:
    """VRChatワールドデータをCSVでエクスポートするクラス"""
    
    def __init__(self):
        self.firebase_manager = FirebaseManager()
        self.output_dir = "exports"
        
        # 出力ディレクトリを作成
        os.makedirs(self.output_dir, exist_ok=True)
    
    def export_all_worlds_to_csv(self, filename: Optional[str] = None) -> str:
        """
        全てのワールドデータをCSVにエクスポート
        
        Args:
            filename: 出力ファイル名（指定しない場合は自動生成）
        
        Returns:
            str: 出力されたファイルパス
        """
        logger.info("Firebase からワールドデータを取得中...")
        
        # Firebaseから全データを取得（制限なし）
        worlds_data = self.firebase_manager.get_all_vrchat_worlds()
        
        if not worlds_data:
            logger.warning("エクスポートするデータが見つかりませんでした")
            return ""
        
        logger.info(f"{len(worlds_data)} 件のワールドデータを取得しました")
        
        # ファイル名を生成
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"vrchat_worlds_{timestamp}.csv"
        
        filepath = os.path.join(self.output_dir, filename)
        
        # CSVに書き込み
        self._write_worlds_to_csv(worlds_data, filepath)
        
        logger.info(f"CSVエクスポート完了: {filepath}")
        logger.info(f"総レコード数: {len(worlds_data)}")
        
        return filepath
    
    def export_worlds_by_criteria(self, 
                                  min_visits: Optional[int] = None,
                                  min_popularity: Optional[int] = None,
                                  min_favorites: Optional[int] = None,
                                  author_name: Optional[str] = None,
                                  release_status: Optional[str] = None,
                                  filename: Optional[str] = None) -> str:
        """
        条件に基づいてワールドデータをフィルタリングしてCSVにエクスポート
        
        Args:
            min_visits: 最小訪問数
            min_popularity: 最小人気度
            min_favorites: 最小お気に入り数
            author_name: 作者名（部分一致）
            release_status: リリースステータス
            filename: 出力ファイル名
        
        Returns:
            str: 出力されたファイルパス
        """
        logger.info("条件に基づくワールドデータのフィルタリングを開始...")
        
        # 全データを取得
        all_worlds = self.firebase_manager.get_all_vrchat_worlds()
        
        if not all_worlds:
            logger.warning("エクスポートするデータが見つかりませんでした")
            return ""
        
        # フィルタリング
        filtered_worlds: List[Dict[str, Any]] = []
        for world in all_worlds:
            # 条件チェック
            if min_visits is not None and world.get('visits', 0) < min_visits:
                continue
            if min_popularity is not None and world.get('popularity', 0) < min_popularity:
                continue
            if min_favorites is not None and world.get('favorites', 0) < min_favorites:
                continue
            if author_name is not None and author_name.lower() not in world.get('authorName', '').lower():
                continue
            if release_status is not None and world.get('releaseStatus', '') != release_status:
                continue
            
            filtered_worlds.append(world)
        
        logger.info(f"フィルタリング結果: {len(filtered_worlds)} / {len(all_worlds)} 件")
        
        if not filtered_worlds:
            logger.warning("フィルタリング条件に一致するデータが見つかりませんでした")
            return ""
        
        # ファイル名を生成
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            conditions: List[str] = []
            if min_visits: conditions.append(f"visits{min_visits}+")
            if min_popularity: conditions.append(f"pop{min_popularity}+")
            if min_favorites: conditions.append(f"fav{min_favorites}+")
            if author_name: conditions.append(f"author-{author_name}")
            if release_status: conditions.append(f"status-{release_status}")
            
            condition_str = "_".join(conditions) if conditions else "filtered"
            filename = f"vrchat_worlds_{condition_str}_{timestamp}.csv"
        
        filepath = os.path.join(self.output_dir, filename)
        
        # CSVに書き込み
        self._write_worlds_to_csv(filtered_worlds, filepath)
        
        logger.info(f"フィルタリング済みCSVエクスポート完了: {filepath}")
        logger.info(f"フィルタリング後レコード数: {len(filtered_worlds)}")
        
        return filepath
    
    def export_popular_worlds_csv(self, top_count: int = 100, filename: Optional[str] = None) -> str:
        """
        人気度順でトップNのワールドをCSVにエクスポート
        
        Args:
            top_count: 上位何件を取得するか
            filename: 出力ファイル名
        
        Returns:
            str: 出力されたファイルパス
        """
        logger.info(f"人気度トップ {top_count} のワールドデータをエクスポート中...")
        
        # 全データを取得
        all_worlds = self.firebase_manager.get_all_vrchat_worlds()
        
        if not all_worlds:
            logger.warning("エクスポートするデータが見つかりませんでした")
            return ""
        
        # 人気度順でソート
        sorted_worlds = sorted(all_worlds, key=lambda x: x.get('popularity', 0), reverse=True)
        top_worlds = sorted_worlds[:top_count]
        
        logger.info(f"人気度トップ {len(top_worlds)} 件を選択しました")
        
        # ファイル名を生成
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"vrchat_worlds_top{top_count}_popularity_{timestamp}.csv"
        
        filepath = os.path.join(self.output_dir, filename)
        
        # CSVに書き込み
        self._write_worlds_to_csv(top_worlds, filepath)
        
        logger.info(f"人気ワールドCSVエクスポート完了: {filepath}")
        logger.info(f"エクスポートレコード数: {len(top_worlds)}")
        
        return filepath
    
    def _write_worlds_to_csv(self, worlds_data: List[Dict[str, Any]], filepath: str) -> None:
        """
        ワールドデータをCSVファイルに書き込み
        
        Args:
            worlds_data: ワールドデータのリスト
            filepath: 出力ファイルパス
        """
        if not worlds_data:
            logger.warning("書き込むデータがありません")
            return
        
        # CSVヘッダーを定義（主要なフィールド）
        headers = [
            'id',
            'name',
            'description',
            'authorName',
            'authorId',
            'capacity',
            'recommendedCapacity',
            'visits',
            'popularity',
            'heat',
            'favorites',
            'publicationDate',
            'labsPublicationDate',
            'created_at',
            'updated_at',
            'version',
            'releaseStatus',
            'platform',
            'imageUrl',
            'thumbnailImageUrl',
            'tags',
            'scraped_at',
            'instances_count'
        ]
        
        try:
            with open(filepath, 'w', newline='', encoding='utf-8-sig') as csvfile:
                writer = csv.DictWriter(csvfile, fieldnames=headers)
                
                # ヘッダー行を書き込み
                writer.writeheader()
                
                # データ行を書き込み
                for world in worlds_data:
                    # CSVレコードを準備
                    csv_record: Dict[str, Any] = {}
                    for header in headers:
                        if header == 'instances_count':
                            # インスタンス数を計算
                            instances = world.get('instances', [])
                            csv_record[header] = len(instances) if isinstance(instances, list) else 0  # type: ignore
                        elif header == 'tags':
                            # タグをカンマ区切りの文字列に変換
                            tags = world.get('tags', [])
                            if isinstance(tags, list):
                                csv_record[header] = ', '.join(str(tag) for tag in tags)  # type: ignore
                            else:
                                csv_record[header] = str(tags) if tags else ''
                        elif header == 'description':
                            # 説明文の改行を除去
                            desc = world.get('description', '')
                            csv_record[header] = str(desc).replace('\n', ' ').replace('\r', ' ') if desc else ''
                        else:
                            # その他のフィールド
                            value = world.get(header, '')
                            csv_record[header] = str(value) if value is not None else ''
                    
                    writer.writerow(csv_record)
                    
            logger.info(f"CSVファイル書き込み完了: {filepath}")
            
        except Exception as e:
            logger.error(f"CSVファイル書き込みエラー: {e}")
            raise
    
    def get_export_statistics(self) -> Dict[str, Any]:
        """
        エクスポート可能なデータの統計情報を取得
        
        Returns:
            Dict[str, Any]: 統計情報
        """
        logger.info("データ統計情報を取得中...")
        
        worlds_data = self.firebase_manager.get_all_vrchat_worlds()
        
        if not worlds_data:
            return {"total_count": 0, "message": "データが見つかりませんでした"}
        
        # 統計計算
        total_count = len(worlds_data)
        total_visits = sum(world.get('visits', 0) for world in worlds_data)
        total_favorites = sum(world.get('favorites', 0) for world in worlds_data)
        
        # 人気度の分布
        popularity_values = [world.get('popularity', 0) for world in worlds_data]
        avg_popularity = sum(popularity_values) / len(popularity_values) if popularity_values else 0
        max_popularity = max(popularity_values) if popularity_values else 0
        
        # 作者の統計
        authors = [world.get('authorName', '') for world in worlds_data if world.get('authorName')]
        unique_authors = len(set(authors))
        
        # リリースステータスの分布
        release_statuses = [world.get('releaseStatus', '') for world in worlds_data]
        status_distribution: Dict[str, int] = {}
        for status in release_statuses:
            if status:
                status_distribution[status] = status_distribution.get(status, 0) + 1
        
        statistics: Dict[str, Any] = {
            "total_count": total_count,
            "total_visits": total_visits,
            "total_favorites": total_favorites,
            "average_popularity": round(avg_popularity, 2),
            "max_popularity": max_popularity,
            "unique_authors": unique_authors,
            "release_status_distribution": status_distribution,
            "export_ready": True
        }
        
        logger.info(f"統計情報: {statistics}")
        return statistics


def main():
    """テスト実行用のメイン関数"""
    exporter = VRChatWorldCSVExporter()
    
    try:
        # 統計情報を表示
        stats = exporter.get_export_statistics()
        print("\n=== VRChatワールドデータ統計 ===")
        print(f"総ワールド数: {stats['total_count']}")
        print(f"総訪問数: {stats['total_visits']:,}")
        print(f"総お気に入り数: {stats['total_favorites']:,}")
        print(f"平均人気度: {stats['average_popularity']}")
        print(f"最大人気度: {stats['max_popularity']}")
        print(f"ユニーク作者数: {stats['unique_authors']}")
        print(f"リリースステータス分布: {stats['release_status_distribution']}")
        
        if stats['total_count'] == 0:
            print("エクスポートするデータがありません。")
            return
        
        print("\n=== CSVエクスポート開始 ===")
        
        # 1. 全データをエクスポート
        print("1. 全データをエクスポート中...")
        filepath1 = exporter.export_all_worlds_to_csv()
        print(f"完了: {filepath1}")
        
        # 2. 人気トップ50をエクスポート
        print("\n2. 人気トップ50をエクスポート中...")
        filepath2 = exporter.export_popular_worlds_csv(top_count=50)
        print(f"完了: {filepath2}")
        
        # 3. 条件付きエクスポート（訪問数1000以上）
        print("\n3. 訪問数1000以上のワールドをエクスポート中...")
        filepath3 = exporter.export_worlds_by_criteria(min_visits=1000)
        print(f"完了: {filepath3}")
        
        print("\n=== エクスポート完了 ===")
        print("exports/ フォルダを確認してください。")
        
    except KeyboardInterrupt:
        print("\n処理が中断されました")
    except Exception as e:
        print(f"エラー: {e}")
        logger.error(f"メイン処理エラー: {e}")


if __name__ == "__main__":
    main()
