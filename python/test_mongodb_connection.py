#!/usr/bin/env python3
"""
MongoDB Atlas接続テストスクリプト
"""

import os
import sys
import logging
from datetime import datetime

# プロジェクトルートをパスに追加
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(current_dir)
sys.path.append(parent_dir)

from mongodb_config import MongoDBManager

# ログ設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def test_mongodb_connection():
    """MongoDB Atlas接続テスト"""
    logger.info("🧪 MongoDB Atlas接続テスト開始")
    logger.info("=" * 60)
    
    try:
        # MongoDB管理インスタンス作成
        mongodb_manager = MongoDBManager()
        
        # 接続状態確認
        if mongodb_manager.is_connected():
            logger.info("✅ MongoDB Atlas接続成功！")
            
            # 統計情報取得テスト
            logger.info("\n📊 統計情報取得テスト:")
            stats = mongodb_manager.get_stats()
            logger.info(f"  - データベース接続: {'✅' if stats.get('database_connected') else '❌'}")
            logger.info(f"  - 総ワールド数: {stats.get('total_worlds', 0)} 件")
            
            # テストデータ挿入
            logger.info("\n💾 テストデータ挿入テスト:")
            test_data = {
                'id': 'test_world_connection_test',
                'world_id': 'test_world_connection_test',
                'name': 'MongoDB接続テストワールド',
                'authorName': 'テストユーザー',
                'description': 'MongoDB接続テスト用のサンプルワールド',
                'capacity': 8,
                'visits': 0,
                'favorites': 0,
                'popularity': 1,
                'scraped_at': datetime.now().isoformat()
            }
            
            if mongodb_manager.save_vrchat_world_data(test_data):
                logger.info("✅ テストデータ挿入成功")
                
                # データ取得テスト
                logger.info("\n🔍 データ取得テスト:")
                retrieved_data = mongodb_manager.get_world_by_id('test_world_connection_test')
                if retrieved_data:
                    logger.info("✅ テストデータ取得成功")
                    logger.info(f"  - ワールド名: {retrieved_data.get('name')}")
                    logger.info(f"  - 作者: {retrieved_data.get('authorName')}")
                else:
                    logger.warning("⚠️ テストデータ取得失敗")
                
                # テストデータ削除
                logger.info("\n🗑️ テストデータ削除:")
                if mongodb_manager.delete_world('test_world_connection_test'):
                    logger.info("✅ テストデータ削除成功")
                else:
                    logger.warning("⚠️ テストデータ削除失敗")
            else:
                logger.error("❌ テストデータ挿入失敗")
            
        else:
            logger.error("❌ MongoDB Atlas接続失敗")
            logger.error("💡 以下を確認してください:")
            logger.error("   1. .envファイルのMONGODB_URI設定")
            logger.error("   2. MongoDB Atlasのネットワークアクセス設定")
            logger.error("   3. データベースユーザー認証情報")
            logger.error("   4. インターネット接続")
        
    except Exception as e:
        logger.error(f"❌ テスト実行エラー: {e}")
        logger.error(f"💡 エラー詳細: {type(e).__name__}: {str(e)}")
    
    logger.info("=" * 60)
    logger.info("🧪 MongoDB Atlas接続テスト終了")

if __name__ == "__main__":
    test_mongodb_connection()
