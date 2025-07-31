#!/usr/bin/env python3
"""
MongoDB Atlas設定クラス
VRChatワールドデータの保存・取得を行う
"""

import os
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.errors import ConnectionFailure, OperationFailure
from pymongo.database import Database
from pymongo.collection import Collection
import certifi
from dotenv import load_dotenv

# .envファイルを読み込み
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
env_path = os.path.join(parent_dir, '.env')
load_dotenv(env_path)

logger = logging.getLogger(__name__)

class MongoDBManager:
    """MongoDB Atlas管理クラス"""
    
    def __init__(self):
        """MongoDB Atlasに接続"""
        self._client: Optional[MongoClient[Dict[str, Any]]] = None
        self._db: Optional[Database[Dict[str, Any]]] = None
        self._collection: Optional[Collection[Dict[str, Any]]] = None
        self._initialize_connection()
    
    def _initialize_connection(self):
        """MongoDB Atlas接続を初期化"""
        try:
            # 環境変数からMongoDB接続情報を取得
            mongodb_uri = os.getenv('MONGODB_URI')
            db_name = os.getenv('MONGODB_DB_NAME', 'nazoweb')
            collection_name = os.getenv('MONGODB_COLLECTION_NAME', 'vrchat_worlds')
            
            logger.info(f"🔧 MongoDB設定確認:")
            logger.info(f"  - DB名: {db_name}")
            logger.info(f"  - コレクション名: {collection_name}")
            logger.info(f"  - URI設定: {'✅ あり' if mongodb_uri else '❌ なし'}")
            
            if not mongodb_uri:
                logger.error("❌ MONGODB_URI環境変数が設定されていません")
                logger.error("💡 .envファイルでMONGODB_URIを設定してください")
                return
            
            # URIの安全な表示（パスワード部分を隠す）
            safe_uri = mongodb_uri.replace(mongodb_uri.split('@')[0].split('://')[-1].split(':')[-1], '***') if '@' in mongodb_uri else mongodb_uri
            logger.info(f"  - 接続URI: {safe_uri}")
            
            # MongoDB Atlasに接続（SSL証明書検証を含む）
            logger.info("🔄 MongoDB Atlas接続試行中...")
            self._client = MongoClient(
                mongodb_uri,
                tlsCAFile=certifi.where(),  # SSL証明書の検証
                serverSelectionTimeoutMS=5000,  # 5秒でタイムアウト
                connectTimeoutMS=10000,  # 10秒でタイムアウト
                socketTimeoutMS=10000    # 10秒でタイムアウト
            )
            
            # 接続テスト
            logger.info("🧪 接続テスト実行中...")
            self._client.admin.command('ping')
            logger.info("✅ MongoDB Atlas接続テスト成功")
            
            # データベースとコレクションを設定
            self._db = self._client[db_name]
            self._collection = self._db[collection_name]
            
            # インデックスを作成（検索パフォーマンス向上）
            self._create_indexes()
            
            logger.info(f"✅ MongoDB Atlas接続成功: {db_name}.{collection_name}")
            
        except ConnectionFailure as e:
            logger.error(f"❌ MongoDB Atlas接続失敗: {e}")
            logger.error("💡 ネットワーク接続とMongoDB Atlas設定を確認してください")
            self._client = None
        except Exception as e:
            logger.error(f"❌ MongoDB Atlas初期化エラー: {e}")
            logger.error(f"💡 エラー詳細: {type(e).__name__}: {str(e)}")
            self._client = None
    
    def _create_indexes(self):
        """検索パフォーマンス向上のためのインデックスを作成"""
        try:
            if self._collection is None:
                return
            
            # 既存のインデックスを確認
            existing_indexes = list(self._collection.list_indexes())
            index_names = [idx['name'] for idx in existing_indexes]
            
            # world_idの一意インデックス
            if 'world_id_1' not in index_names:
                self._collection.create_index([('world_id', ASCENDING)], unique=True)
                logger.info("📋 world_idインデックス作成完了")
            
            # 検索用のテキストインデックス
            if 'text_search' not in index_names:
                self._collection.create_index([
                    ('name', 'text'),
                    ('title', 'text'),
                    ('description', 'text'),
                    ('authorName', 'text')
                ], name='text_search')
                logger.info("🔍 テキスト検索インデックス作成完了")
            
            # 人気度ソート用インデックス
            if 'popularity_-1' not in index_names:
                self._collection.create_index([('popularity', DESCENDING)])
                logger.info("📊 人気度インデックス作成完了")
            
            # 更新日時インデックス
            if 'updated_at_-1' not in index_names:
                self._collection.create_index([('updated_at', DESCENDING)])
                logger.info("⏰ 更新日時インデックス作成完了")
                
        except Exception as e:
            logger.warning(f"⚠️ インデックス作成中にエラー: {e}")
    
    def is_connected(self) -> bool:
        """MongoDB接続状態を確認"""
        try:
            if self._client is None:
                return False
            self._client.admin.command('ping')
            return True
        except Exception:
            return False
    
    def save_vrchat_world_data(self, world_data: Dict[str, Any]) -> bool:
        """VRChatワールドデータをMongoDBに保存"""
        try:
            if not self.is_connected() or self._collection is None:
                logger.error("❌ MongoDB接続が無効です")
                return False
            
            # world_idが必須
            world_id = world_data.get('id') or world_data.get('world_id')
            if not world_id:
                logger.error("❌ world_idが見つかりません")
                return False
            
            # データの準備
            document = {
                **world_data,
                'world_id': world_id,  # 統一されたキー名
                'updated_at': datetime.now(),
                'created_at': world_data.get('created_at', datetime.now())
            }
            
            # upsert操作（存在する場合は更新、しない場合は挿入）
            result = self._collection.replace_one(
                {'world_id': world_id},
                document,
                upsert=True
            )
            
            if result.upserted_id or result.modified_count > 0:
                action = "挿入" if result.upserted_id else "更新"
                logger.debug(f"💾 MongoDB {action}完了: {world_id}")
                return True
            else:
                logger.warning(f"⚠️ MongoDB保存で変更なし: {world_id}")
                return True
                
        except Exception as e:
            logger.error(f"❌ MongoDB保存エラー: {e}")
            return False
    
    def get_all_worlds(self, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """全てのワールドデータを取得"""
        try:
            if not self.is_connected() or self._collection is None:
                logger.error("❌ MongoDB接続が無効です")
                return []
            
            cursor = self._collection.find().sort('updated_at', DESCENDING)
            
            if limit:
                cursor = cursor.limit(limit)
            
            worlds = list(cursor)
            
            # ObjectIdを文字列に変換
            for world in worlds:
                if '_id' in world:
                    world['_id'] = str(world['_id'])
            
            logger.info(f"📊 MongoDB から {len(worlds)} 件のワールドを取得")
            return worlds
            
        except Exception as e:
            logger.error(f"❌ MongoDB取得エラー: {e}")
            return []
    
    def search_worlds(self, search_term: str, limit: int = 50) -> List[Dict[str, Any]]:
        """ワールドを検索"""
        try:
            if not self.is_connected() or self._collection is None:
                return []
            
            # テキスト検索
            cursor = self._collection.find(
                {'$text': {'$search': search_term}},
                {'score': {'$meta': 'textScore'}}
            ).sort([('score', {'$meta': 'textScore'})]).limit(limit)
            
            worlds = list(cursor)
            
            # ObjectIdを文字列に変換
            for world in worlds:
                if '_id' in world:
                    world['_id'] = str(world['_id'])
            
            return worlds
            
        except Exception as e:
            logger.error(f"❌ MongoDB検索エラー: {e}")
            return []
    
    def get_world_by_id(self, world_id: str) -> Optional[Dict[str, Any]]:
        """ワールドIDで特定のワールドを取得"""
        try:
            if not self.is_connected() or self._collection is None:
                return None
            
            world = self._collection.find_one({'world_id': world_id})
            
            if world and '_id' in world:
                world['_id'] = str(world['_id'])
            
            return world
            
        except Exception as e:
            logger.error(f"❌ MongoDB取得エラー: {e}")
            return None
    
    def get_stats(self) -> Dict[str, Any]:
        """データベース統計情報を取得"""
        try:
            if not self.is_connected() or self._collection is None:
                return {}
            
            total_count = self._collection.count_documents({})
            
            # 最新の更新日時
            latest_world = self._collection.find_one(
                sort=[('updated_at', DESCENDING)]
            )
            
            # 人気度の高いワールド
            popular_worlds = list(self._collection.find(
                sort=[('popularity', DESCENDING)]
            ).limit(5))
            
            return {
                'total_worlds': total_count,
                'latest_update': latest_world.get('updated_at') if latest_world else None,
                'popular_worlds': popular_worlds,
                'database_connected': True
            }
            
        except Exception as e:
            logger.error(f"❌ MongoDB統計取得エラー: {e}")
            return {'database_connected': False}
    
    def delete_world(self, world_id: str) -> bool:
        """ワールドを削除"""
        try:
            if not self.is_connected() or self._collection is None:
                return False
            
            result = self._collection.delete_one({'world_id': world_id})
            return result.deleted_count > 0
            
        except Exception as e:
            logger.error(f"❌ MongoDB削除エラー: {e}")
            return False
    
    def close_connection(self):
        """MongoDB接続を閉じる"""
        if self._client:
            self._client.close()
            logger.info("🔌 MongoDB接続を閉じました")

# シングルトンインスタンス
_mongodb_manager = None

def get_mongodb_manager() -> MongoDBManager:
    """MongoDBManagerのシングルトンインスタンスを取得"""
    global _mongodb_manager
    if _mongodb_manager is None:
        _mongodb_manager = MongoDBManager()
    return _mongodb_manager
