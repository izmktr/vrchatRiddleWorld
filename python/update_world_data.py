#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ワールドデータ更新プログラム

update_mongodb.txtの設計に従い、以下の処理を行います：
1. worldsコレクションのデータを更新（長期間未更新のワールドは更新間隔を延ばす）
2. new_worldsコレクションのデータをworldsコレクションに追加
3. 処理済みのnew_worldsデータを削除
"""

import os
import sys
import time
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional, Tuple

# ライブラリパスを絶対パスで追加
lib_path = os.path.abspath(os.path.join(os.path.dirname(__file__), 'lib'))
if lib_path not in sys.path:
    sys.path.insert(0, lib_path)

from lib.mongodb_manager import MongoDBManager
from lib.vrchat_scraper import VRChatWorldScraper
from lib.utils import save_raw_data


class WorldDataUpdater:
    """ワールドデータ更新クラス"""
    
    def __init__(self):
        self.mongodb = MongoDBManager()
        self.scraper = VRChatWorldScraper()
        self.success_count = 0
        self.skip_count = 0
        self.error_count = 0
        self.error_worlds: List[str] = []
        
    def should_update_world(self, world_doc: Dict[str, Any]) -> bool:
        """ワールドを更新すべきかどうかを判定"""
        try:
            now = datetime.now(timezone.utc)
            
            # scraped_at（最終スクレイピング日時）
            scraped_at = world_doc.get('scraped_at')
            if not scraped_at:
                return True  # scraped_atがない場合は更新対象
            
            # 日時変換
            if isinstance(scraped_at, str):
                scraped_at = datetime.fromisoformat(scraped_at.replace('Z', '+00:00'))
            elif hasattr(scraped_at, 'replace'):  # datetime object
                scraped_at = scraped_at.replace(tzinfo=timezone.utc)
            
            # 経過時間 = 現在時刻 - scraped_at
            elapsed_time = now - scraped_at
            elapsed_hours = elapsed_time.total_seconds() / 3600
            
            # 1日未満は更新しない
            if elapsed_hours < 24:
                return False
            
            # updated_at（VRChatでの最終更新日時）
            updated_at = world_doc.get('updated_at')
            if updated_at:
                if isinstance(updated_at, str):
                    updated_at = datetime.fromisoformat(updated_at.replace('Z', '+00:00'))
                elif hasattr(updated_at, 'replace'):  # datetime object
                    updated_at = updated_at.replace(tzinfo=timezone.utc)
                
                # 最終アップデート時間 = scraped_at - updated_at
                last_update_time = scraped_at - updated_at
                last_update_hours = last_update_time.total_seconds() / 3600
                
                # 条件1: 経過時間*10 > 最終アップデート時間
                condition1 = elapsed_hours * 10 > last_update_hours
            else:
                condition1 = True  # updated_atがない場合は更新対象
            
            # 条件2: 経過時間が30日以上
            condition2 = elapsed_hours >= (30 * 24)  # 30日 = 720時間
            
            # どちらかの条件を満たせば更新対象
            return condition1 or condition2
            
        except Exception as e:
            print(f"⚠️  更新判定エラー: {e}")
            return False
    
    def update_existing_worlds(self) -> None:
        """既存ワールドの更新処理"""
        print("🔄 既存ワールドの更新処理を開始...")
        
        try:
            if not self.mongodb.is_connected():
                print("❌ MongoDB接続エラー")
                return
            
            # worldsコレクションから全データを取得
            worlds = self.mongodb.get_all_worlds()
            print(f"📋 {len(worlds)}件のワールドデータを取得しました")
            
            update_targets: List[Tuple[str, str, Dict[str, Any]]] = []
            
            # 更新対象を選定
            for world in worlds:
                if self.should_update_world(world):
                    source_url = world.get('source_url')
                    if source_url:
                        world_id = world.get('world_id') or world.get('id', '')
                        update_targets.append((world_id, source_url, world))
            
            print(f"🎯 {len(update_targets)}件が更新対象です")
            
            if not update_targets:
                print("✅ 更新対象のワールドはありません")
                return
            
            # 更新処理を実行
            for i, (world_id, source_url, _) in enumerate(update_targets, 1):
                
                print(f"\\n🔄 [{i}/{len(update_targets)}] 更新中: {world_id}")
                
                try:
                    # VRChat APIからデータを取得
                    world_data = self.scraper.scrape_world_by_url(source_url)
                    if not world_data:
                        print(f"❌ データ取得失敗: {world_id}")
                        self.error_count += 1
                        self.error_worlds.append(f"{world_id} - データ取得失敗")
                        continue
                    
                    # キャッシュから取得した場合はスキップ
                    if world_data.get('_from_cache', False):
                        print(f"⏭️  キャッシュデータのためスキップ: {world_id}")
                        self.skip_count += 1
                        continue
                    
                    # MongoDBに保存
                    if self.mongodb.save_world_data(world_data):
                        print(f"✅ 更新完了: {world_id}")
                        self.success_count += 1
                        
                        # 生データも保存
                        raw_data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'raw_data')
                        save_raw_data(world_data, raw_data_dir)
                        
                        # レート制限（2秒間隔）
                        if i < len(update_targets):
                            time.sleep(2)
                    else:
                        print(f"❌ 保存失敗: {world_id}")
                        self.error_count += 1
                        self.error_worlds.append(f"{world_id} - 保存失敗")
                        
                except Exception as e:
                    print(f"❌ 更新エラー {world_id}: {e}")
                    self.error_count += 1
                    self.error_worlds.append(f"{world_id} - 例外: {str(e)}")
                    continue
                    
        except Exception as e:
            print(f"❌ 既存ワールド更新処理エラー: {e}")
    
    def process_new_worlds(self) -> None:
        """新規ワールドの処理"""
        print("\\n➕ 新規ワールドの処理を開始...")
        
        try:
            if not self.mongodb.is_connected():
                print("❌ MongoDB接続エラー")
                return
            
            # new_worldsコレクションを取得
            new_worlds_collection = self.mongodb.get_collection('new_worlds')
            if new_worlds_collection is None:
                print("❌ new_worldsコレクションにアクセスできません")
                return
            
            # new_worldsコレクションからデータを取得
            new_worlds = list(new_worlds_collection.find({'status': {'$in': ['pending', 'error']}}))
            
            if not new_worlds:
                print("✅ 処理対象の新規ワールドはありません")
                return
            
            print(f"📋 {len(new_worlds)}件の新規ワールドを処理します")
            
            processed_ids: List[Any] = []
            
            for i, new_world in enumerate(new_worlds, 1):
                world_url = new_world.get('url', '')
                new_world_id = new_world.get('_id')
                
                if not world_url:
                    continue
                
                print(f"\\n🔄 [{i}/{len(new_worlds)}] 新規ワールド処理: {world_url}")
                
                try:
                    # new_worldsのステータスを処理中に更新
                    new_worlds_collection.update_one(
                        {'_id': new_world_id},
                        {'$set': {'status': 'processing', 'processed_at': datetime.now()}}
                    )
                    
                    # VRChat APIからデータを取得
                    world_data = self.scraper.scrape_world_by_url(world_url)
                    if not world_data:
                        print(f"❌ データ取得失敗: {world_url}")
                        # ステータスをエラーに更新
                        new_worlds_collection.update_one(
                            {'_id': new_world_id},
                            {'$set': {'status': 'error', 'error_message': 'データ取得失敗'}}
                        )
                        self.error_count += 1
                        self.error_worlds.append(f"{world_url} - データ取得失敗")
                        continue
                    
                    # worldsコレクションに保存
                    if self.mongodb.save_world_data(world_data):
                        print(f"✅ 新規ワールド追加完了: {world_data.get('id')}")
                        
                        # 生データも保存
                        raw_data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'raw_data')
                        save_raw_data(world_data, raw_data_dir)
                        
                        # ステータスを完了に更新
                        new_worlds_collection.update_one(
                            {'_id': new_world_id},
                            {'$set': {'status': 'completed'}}
                        )
                        
                        processed_ids.append(new_world_id)
                        self.success_count += 1
                        
                        # レート制限（2秒間隔）
                        if i < len(new_worlds):
                            time.sleep(2)
                    else:
                        print(f"❌ 保存失敗: {world_url}")
                        # ステータスをエラーに更新
                        new_worlds_collection.update_one(
                            {'_id': new_world_id},
                            {'$set': {'status': 'error', 'error_message': '保存失敗'}}
                        )
                        self.error_count += 1
                        self.error_worlds.append(f"{world_url} - 保存失敗")
                        
                except Exception as e:
                    print(f"❌ 新規ワールド処理エラー {world_url}: {e}")
                    # ステータスをエラーに更新
                    if new_world_id:
                        new_worlds_collection.update_one(
                            {'_id': new_world_id},
                            {'$set': {'status': 'error', 'error_message': str(e)}}
                        )
                    self.error_count += 1
                    self.error_worlds.append(f"{world_url} - 例外: {str(e)}")
                    continue
            
            # 完了したnew_worldsデータを削除
            if processed_ids:
                delete_result = new_worlds_collection.delete_many(
                    {'_id': {'$in': processed_ids}, 'status': 'completed'}
                )
                print(f"🗑️  {delete_result.deleted_count}件の処理済みデータを削除しました")
                
        except Exception as e:
            print(f"❌ 新規ワールド処理エラー: {e}")
    
    def print_summary(self):
        """処理結果のサマリーを表示"""
        print("\\n" + "=" * 50)
        print("📊 ワールドデータ更新結果サマリー")
        print(f"✅ 成功: {self.success_count}件")
        print(f"⏭️  スキップ: {self.skip_count}件")
        print(f"❌ エラー: {self.error_count}件")
        print("=" * 50)
        
        # エラーワールドのログ出力
        if self.error_worlds:
            error_log_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'error_world.txt')
            try:
                with open(error_log_path, 'a', encoding='utf-8') as f:
                    f.write(f"\\n# ワールドデータ更新エラーログ - {time.strftime('%Y-%m-%d %H:%M:%S')}\\n")
                    f.write(f"# エラー数: {self.error_count}件\\n\\n")
                    for error_entry in self.error_worlds:
                        f.write(f"{error_entry}\\n")
                print(f"📝 エラーログを出力しました: error_world.txt ({self.error_count}件)")
            except Exception as e:
                print(f"⚠️  エラーログの出力に失敗: {str(e)}")
        else:
            print("🎉 エラーなく全て処理が完了しました！")
    
    def cleanup(self):
        """リソースのクリーンアップ"""
        if hasattr(self, 'scraper'):
            self.scraper.cleanup()
        if hasattr(self, 'mongodb'):
            self.mongodb.close()


def main():
    """メイン処理"""
    print("🔄 ワールドデータ更新プログラム")
    print("=" * 50)
    
    updater = WorldDataUpdater()
    
    try:
        # 1. 既存ワールドの更新処理
        updater.update_existing_worlds()
        
        # 2. 新規ワールドの処理
        updater.process_new_worlds()
        
        # 3. 結果サマリー
        updater.print_summary()
        
    except KeyboardInterrupt:
        print("\\n⚠️  処理が中断されました")
    except Exception as e:
        print(f"❌ 予期しないエラー: {e}")
    finally:
        updater.cleanup()


if __name__ == "__main__":
    main()
