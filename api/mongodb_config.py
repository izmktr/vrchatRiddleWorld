"""
Vercel環境用のMongoDB設定
MongoDBからVRChatワールドデータを読み取り専用で提供
"""
import os
from typing import List, Dict, Any
from pymongo import MongoClient
from datetime import datetime

# グローバル変数
client = None
db = None
collection = None

def initialize_mongodb():
    """MongoDB接続を初期化"""
    global client, db, collection
    
    if client is not None:
        return collection
    
    try:
        # MongoDB Atlas接続
        mongodb_uri = os.getenv('MONGODB_URI')
        if not mongodb_uri:
            print("MONGODB_URI environment variable not found")
            return None
        
        client = MongoClient(mongodb_uri)
        db_name = os.getenv('MONGODB_DB_NAME', 'vrcworld')
        collection_name = os.getenv('MONGODB_COLLECTION_NAME', 'worlds')
        
        db = client[db_name]
        collection = db[collection_name]
        
        # 接続テスト
        collection.find_one()
        print("MongoDB connection successful")
        return collection
        
    except Exception as e:
        print(f"MongoDB initialization error: {e}")
        return None

def get_all_worlds() -> List[Dict[str, Any]]:
    """全てのワールドデータを取得"""
    try:
        collection = initialize_mongodb()
        if collection is None:
            return []
        
        # MongoDBから全ワールドデータを取得
        cursor = collection.find({}).sort("updated_at", -1)
        worlds = []
        
        for doc in cursor:
            # MongoDB ObjectIdを文字列に変換
            if '_id' in doc:
                doc['_id'] = str(doc['_id'])
            
            # 日付フィールドの正規化
            for field in ['created_at', 'updated_at', 'scraped_at']:
                if field in doc and isinstance(doc[field], datetime):
                    doc[field] = doc[field].isoformat()
            
            worlds.append(doc)
        
        return worlds
        
    except Exception as e:
        print(f"Error fetching worlds from MongoDB: {e}")
        return []

def get_world_by_id(world_id: str) -> Dict[str, Any]:
    """特定のワールドデータを取得"""
    try:
        collection = initialize_mongodb()
        if collection is None:
            return {}
        
        # world_idでワールドを検索
        doc = collection.find_one({"id": world_id})
        if doc:
            if '_id' in doc:
                doc['_id'] = str(doc['_id'])
            
            # 日付フィールドの正規化
            for field in ['created_at', 'updated_at', 'scraped_at']:
                if field in doc and isinstance(doc[field], datetime):
                    doc[field] = doc[field].isoformat()
        
        return doc or {}
        
    except Exception as e:
        print(f"Error fetching world {world_id} from MongoDB: {e}")
        return {}

# 初期化実行
initialize_mongodb()
