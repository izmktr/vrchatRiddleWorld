"""
MongoDB Atlas設定ライブラリ
"""

import os
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.errors import ConnectionFailure, OperationFailure
from pymongo.database import Database
from pymongo.collection import Collection
import certifi
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# 環境変数読み込み
def load_environment():
    """環境変数を読み込み"""
    env_paths = ['.env', '../.env', '../../.env']
    for env_path in env_paths:
        if os.path.exists(env_path):
            load_dotenv(env_path)
            return
    load_dotenv()

class MongoDBManager:
    """MongoDB Atlas管理クラス"""
    
    def __init__(self):
        load_environment()
        self._client: Optional[MongoClient[Dict[str, Any]]] = None
        self._db: Optional[Database[Dict[str, Any]]] = None
        self._collection: Optional[Collection[Dict[str, Any]]] = None
        self._initialize_connection()
    
    def _initialize_connection(self):
        """MongoDB Atlas接続を初期化"""
        try:
            mongodb_uri = os.getenv('MONGODB_URI')
            db_name = os.getenv('MONGODB_DB_NAME', 'vrcworld')
            collection_name = os.getenv('MONGODB_COLLECTION_NAME', 'worlds')
            
            if not mongodb_uri:
                logger.error("❌ MONGODB_URI環境変数が設定されていません")
                return
            
            self._client = MongoClient(
                mongodb_uri,
                tlsCAFile=certifi.where(),
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=10000,
                socketTimeoutMS=10000
            )
            
            # 接続テスト
            self._client.admin.command('ping')
            
            self._db = self._client[db_name]
            self._collection = self._db[collection_name]
            
            logger.info(f"✅ MongoDB Atlas接続成功: {db_name}.{collection_name}")
            
        except Exception as e:
            logger.error(f"❌ MongoDB Atlas接続エラー: {e}")
            self._client = None
    
    def is_connected(self) -> bool:
        """接続状態確認"""
        try:
            if self._client is None:
                return False
            self._client.admin.command('ping')
            return True
        except Exception:
            return False
    
    def save_world_data(self, world_data: Dict[str, Any]) -> bool:
        """ワールドデータを保存"""
        try:
            if not self.is_connected() or self._collection is None:
                return False
            
            world_id = world_data.get('id')
            if not world_id:
                return False
            
            document = {
                **world_data,
                'world_id': world_id,
                'scraped_at': datetime.now(),  # アップロード日時を別フィールドで記録
                # updated_atとcreated_atは元データを保持
            }
            
            # created_atが存在しない場合のみデフォルト値を設定
            if 'created_at' not in document:
                document['created_at'] = datetime.now()
            
            result = self._collection.replace_one(
                {'world_id': world_id},
                document,
                upsert=True
            )
            
            return result.upserted_id is not None or result.modified_count > 0
            
        except Exception as e:
            logger.error(f"❌ MongoDB保存エラー: {e}")
            return False
    
    def get_stats(self) -> Dict[str, Any]:
        """統計情報取得"""
        try:
            if not self.is_connected() or self._collection is None:
                return {'total': 0, 'connected': False}
            
            total = self._collection.count_documents({})
            return {'total': total, 'connected': True}
            
        except Exception as e:
            logger.error(f"❌ 統計取得エラー: {e}")
            return {'total': 0, 'connected': False}
    
    def close(self):
        """接続を閉じる"""
        if self._client:
            self._client.close()
