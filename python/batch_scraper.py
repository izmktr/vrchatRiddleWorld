#!/usr/bin/env python3
"""
VRChatワールドバッチ処理スクリプト
vrcworld.txtファイルからURLリストを読み込んでデータベースを構築
"""

import sys
import os
import time
import logging
from datetime import datetime
from typing import List, Dict, Optional, Any

# プロジェクトルートをパスに追加
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(current_dir)
sys.path.append(parent_dir)

from vrchat_scraper import VRChatWorldScraper
from firebase_config import FirebaseManager

# ログ設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(parent_dir, 'batch_scraper.log'), encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class VRChatBatchProcessor:
    """VRChatワールドバッチ処理クラス"""
    
    def __init__(self, file_path: Optional[str] = None, delay: float = 2.0):
        """
        Args:
            file_path: ワールドURLリストファイルのパス
            delay: リクエスト間隔（秒）
        """
        # デフォルトファイルパスを設定
        if file_path is None:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            parent_dir = os.path.dirname(current_dir)
            file_path = os.path.join(parent_dir, 'vrcworld.txt')
        self.file_path = file_path
        self.delay = delay
        self.scraper = VRChatWorldScraper()
        self.firebase_manager = FirebaseManager()
        self.results: List[Dict[str, Any]] = []
        
    def load_urls_from_file(self) -> List[str]:
        """ファイルからVRChatワールドURLを読み込み"""
        try:
            # BOM付きUTF-8も対応
            with open(self.file_path, 'r', encoding='utf-8-sig') as f:
                urls = [
                    line.strip() 
                    for line in f 
                    if line.strip() and line.strip().startswith('https://vrchat.com/home/world/')
                ]
            
            logger.info(f"📁 ファイル '{self.file_path}' から {len(urls)} 件のURLを読み込みました")
            return urls
            
        except FileNotFoundError:
            logger.error(f"❌ ファイルが見つかりません: {self.file_path}")
            return []
        except Exception as e:
            logger.error(f"❌ ファイル読み込みエラー: {e}")
            return []
    
    def process_batch(self) -> List[Dict[str, Any]]:
        """バッチ処理を実行"""
        urls = self.load_urls_from_file()
        
        if not urls:
            logger.warning("⚠️  処理可能なURLがありません")
            return []
        
        total_urls = len(urls)
        successful_count = 0
        failed_count = 0
        
        logger.info(f"🚀 バッチ処理開始: {total_urls} 件のワールドをスクレイピングします")
        logger.info(f"⏱️  リクエスト間隔: {self.delay} 秒")
        
        start_time = time.time()
        
        for i, url in enumerate(urls, 1):
            try:
                logger.info(f"\n📍 進行状況: {i}/{total_urls} ({i/total_urls*100:.1f}%)")
                logger.info(f"🔗 処理中: {url}")
                
                # ワールド情報を取得
                world_info = self.scraper.scrape_world_by_url(url)  # type: ignore
                
                if world_info:
                    # 型安全性のための型アサーション
                    world_data: Dict[str, Any] = world_info  # type: ignore
                    self.results.append(world_data)
                    successful_count += 1
                    
                    logger.info(f"✅ 成功: {world_data.get('title', 'Unknown')}")
                    logger.info(f"👤 作者: {world_data.get('creator', 'Unknown')}")
                    logger.info(f"🏠 定員: {world_data.get('capacity', 'Unknown')}人")
                    
                    # Firebaseに保存
                    try:
                        if self.firebase_manager.save_vrchat_world_data(world_data):  # type: ignore
                            logger.info(f"💾 Firebase保存完了: {world_data.get('world_id', 'unknown')}")
                        else:
                            logger.warning(f"⚠️  Firebase保存失敗: {world_data.get('world_id', 'unknown')}")
                    except Exception as e:
                        logger.error(f"❌ Firebase保存エラー: {e}")
                        
                else:
                    failed_count += 1
                    logger.warning(f"❌ 失敗: {url}")
                
                # 進行状況表示
                remaining = total_urls - i
                elapsed = time.time() - start_time
                if i > 0:
                    avg_time = elapsed / i
                    eta = avg_time * remaining
                    logger.info(f"⏰ 経過時間: {elapsed:.1f}秒, 推定残り時間: {eta:.1f}秒")
                
                # レート制限のための待機（最後のアイテム以外）
                if i < total_urls:
                    logger.info(f"💤 {self.delay}秒待機中...")
                    time.sleep(self.delay)
                    
            except KeyboardInterrupt:
                logger.info("⚠️  ユーザーによって処理が中断されました")
                break
            except Exception as e:
                failed_count += 1
                logger.error(f"❌ URL処理エラー {url}: {e}")
                continue
        
        # 結果サマリー
        total_time = time.time() - start_time
        self.print_summary(successful_count, failed_count, total_time)
        
        return self.results
    
    def print_summary(self, successful_count: int, failed_count: int, total_time: float):
        """処理結果のサマリーを表示"""
        total_processed = successful_count + failed_count
        
        logger.info(f"\n" + "="*60)
        logger.info(f"🎉 バッチ処理完了!")
        logger.info(f"="*60)
        logger.info(f"✅ 成功: {successful_count} 件")
        logger.info(f"❌ 失敗: {failed_count} 件")
        logger.info(f"📊 成功率: {successful_count/total_processed*100:.1f}%" if total_processed > 0 else "成功率: 0%")
        logger.info(f"⏰ 総処理時間: {total_time:.1f} 秒")
        logger.info(f"⚡ 平均処理時間: {total_time/total_processed:.1f} 秒/件" if total_processed > 0 else "平均処理時間: 0秒/件")
        
        if self.results:
            # 統計情報
            total_capacity = sum(
                int(w.get('capacity', 0)) 
                if str(w.get('capacity', '')).isdigit() 
                else 0 
                for w in self.results
            )
            
            logger.info(f"\n📈 取得データ統計:")
            logger.info(f"・総ワールド数: {len(self.results)} 件")
            logger.info(f"・合計定員: {total_capacity} 人")
            logger.info(f"・平均定員: {total_capacity // len(self.results)} 人" if self.results else "・平均定員: 0 人")
            
            # 取得したワールドのリスト
            logger.info(f"\n📋 取得したワールド一覧:")
            for i, world in enumerate(self.results[:10], 1):
                world_data = world  # 型アサーション用
                title = str(world_data.get('title', 'Unknown'))[:30]
                creator = str(world_data.get('creator', 'Unknown'))[:15]
                capacity = world_data.get('capacity', 'Unknown')
                logger.info(f"{i:2d}. {title:<30} | {creator:<15} | 定員:{capacity}人")
            
            if len(self.results) > 10:
                logger.info(f"... 他 {len(self.results) - 10} 件")
        
        logger.info(f"="*60)
    
    def export_to_csv(self, filename: Optional[str] = None) -> None:
        """結果をCSVファイルに出力"""
        import csv  # CSV出力のために必要
        
        if not self.results:
            logger.warning("⚠️  出力するデータがありません")
            return
        
        if filename is None:
            filename = f"vrchat_worlds_batch_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        
        try:
            import csv
            
            with open(filename, 'w', newline='', encoding='utf-8-sig') as csvfile:
                fieldnames = ['world_id', 'title', 'creator', 'description', 'capacity', 'published', 'thumbnail_url', 'scraped_at']
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                
                writer.writeheader()
                for world in self.results:
                    world_data = world  # 型アサーション用
                    writer.writerow({
                        'world_id': str(world_data.get('world_id', '')),
                        'title': str(world_data.get('title', '')),
                        'creator': str(world_data.get('creator', '')),
                        'description': str(world_data.get('description', '')),
                        'capacity': str(world_data.get('capacity', '')),
                        'published': str(world_data.get('published', '')),
                        'thumbnail_url': str(world_data.get('thumbnail_url', '')),
                        'scraped_at': str(world_data.get('scraped_at', ''))
                    })
            
            logger.info(f"📥 CSV出力完了: {filename}")
            
        except Exception as e:
            logger.error(f"❌ CSV出力エラー: {e}")

def main():
    """メイン実行関数"""
    import argparse
    
    parser = argparse.ArgumentParser(description='VRChatワールドバッチ処理ツール')
    parser.add_argument('--file', '-f', type=str, default=None, 
                        help='ワールドURLリストファイル (デフォルト: ../vrcworld.txt)')
    parser.add_argument('--delay', '-d', type=float, default=2.0, 
                        help='リクエスト間隔（秒）(デフォルト: 2.0)')
    parser.add_argument('--csv', '-c', action='store_true', 
                        help='結果をCSVファイルに出力')
    parser.add_argument('--output', '-o', type=str, 
                        help='出力CSVファイル名')
    
    args = parser.parse_args()
    
    # バッチ処理実行
    processor = VRChatBatchProcessor(args.file, args.delay)
    
    try:
        results = processor.process_batch()
        
        # CSV出力（オプション）
        if args.csv and results:
            processor.export_to_csv(args.output)
            
    except KeyboardInterrupt:
        logger.info("\n⚠️  処理が中断されました")
    except Exception as e:
        logger.error(f"❌ 予期しないエラー: {e}")
    finally:
        # クリーンアップ
        processor.scraper.cleanup()

if __name__ == "__main__":
    main()
