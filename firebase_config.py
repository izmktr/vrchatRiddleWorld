"""
Firebase設定とデータベース操作
"""

import os
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional
from google.cloud import firestore
import firebase_admin
from firebase_admin import credentials, firestore as admin_firestore

logger = logging.getLogger(__name__)

class FirebaseManager:
    """Firebase Firestoreとの連携を管理するクラス"""
    
    def __init__(self):
        self.db = None
        self.initialize_firebase()
    
    def initialize_firebase(self):
        """Firebase Admin SDKの初期化"""
        try:
            # 環境変数からサービスアカウントキーのパスを取得
            service_account_path = os.getenv('FIREBASE_SERVICE_ACCOUNT_PATH')
            
            if service_account_path and os.path.exists(service_account_path):
                # サービスアカウントキーファイルを使用
                cred = credentials.Certificate(service_account_path)
                if not firebase_admin._apps:
                    firebase_admin.initialize_app(cred)
                self.db = admin_firestore.client()
                logger.info("Firebase Admin SDK初期化完了（サービスアカウント使用）")
            
            elif os.getenv('FIREBASE_PROJECT_ID'):
                # プロジェクトIDのみでの初期化（Google Cloud環境など）
                if not firebase_admin._apps:
                    firebase_admin.initialize_app()
                self.db = admin_firestore.client()
                logger.info("Firebase Admin SDK初期化完了（デフォルト認証使用）")
            
            else:
                logger.warning("Firebase設定が見つかりません。.envファイルを確認してください。")
                # テスト用のダミークライアント
                self.db = None
                
        except Exception as e:
            logger.error(f"Firebase初期化エラー: {e}")
            self.db = None
    
    def save_scraped_data(self, data: Dict) -> bool:
        """スクレイピングデータをFirestoreに保存"""
        if not self.db:
            logger.warning("Firebaseが初期化されていません。データを保存できません。")
            return False
        
        try:
            # コレクション名を設定
            collection_ref = self.db.collection('scraped_data')
            
            # ドキュメントIDをURLのハッシュにする（重複回避）
            import hashlib
            doc_id = hashlib.md5(data['url'].encode()).hexdigest()
            
            # タイムスタンプを追加
            data['created_at'] = firestore.SERVER_TIMESTAMP
            data['updated_at'] = firestore.SERVER_TIMESTAMP
            
            # データを保存
            collection_ref.document(doc_id).set(data, merge=True)
            logger.info(f"データ保存完了: {data.get('title', 'タイトルなし')}")
            return True
            
        except Exception as e:
            logger.error(f"データ保存エラー: {e}")
            return False
    
    def get_scraped_data(self, limit: int = 100) -> List[Dict]:
        """保存されたスクレイピングデータを取得"""
        if not self.db:
            logger.warning("Firebaseが初期化されていません。")
            return []
        
        try:
            collection_ref = self.db.collection('scraped_data')
            docs = collection_ref.order_by('created_at', direction=firestore.Query.DESCENDING).limit(limit).stream()
            
            results = []
            for doc in docs:
                data = doc.to_dict()
                data['id'] = doc.id
                results.append(data)
            
            logger.info(f"{len(results)}件のデータを取得しました")
            return results
            
        except Exception as e:
            logger.error(f"データ取得エラー: {e}")
            return []
    
    def delete_old_data(self, days: int = 30) -> int:
        """古いデータを削除"""
        if not self.db:
            logger.warning("Firebaseが初期化されていません。")
            return 0
        
        try:
            from datetime import timedelta
            cutoff_date = datetime.now() - timedelta(days=days)
            
            collection_ref = self.db.collection('scraped_data')
            query = collection_ref.where('created_at', '<', cutoff_date)
            
            deleted_count = 0
            for doc in query.stream():
                doc.reference.delete()
                deleted_count += 1
            
            logger.info(f"{deleted_count}件の古いデータを削除しました")
            return deleted_count
            
        except Exception as e:
            logger.error(f"データ削除エラー: {e}")
            return 0
    
    def save_vrchat_world_data(self, world_data: Dict) -> bool:
        """VRChatワールドデータをFirestoreに保存"""
        if not self.db:
            logger.warning("Firebaseが初期化されていません。データを保存できません。")
            return False
        
        try:
            # VRChatワールド用のコレクション
            collection_ref = self.db.collection('vrchat_worlds')
            
            # ドキュメントIDをworld_idにする
            doc_id = world_data.get('world_id', '')
            if not doc_id:
                logger.error("world_idが見つかりません")
                return False
            
            # タイムスタンプを追加
            world_data['created_at'] = firestore.SERVER_TIMESTAMP
            world_data['updated_at'] = firestore.SERVER_TIMESTAMP
            
            # データを保存（既存データがあれば更新）
            collection_ref.document(doc_id).set(world_data, merge=True)
            logger.info(f"VRChatワールドデータ保存完了: {world_data.get('name', 'Unknown')}")
            return True
            
        except Exception as e:
            logger.error(f"VRChatワールドデータ保存エラー: {e}")
            return False
    
    def get_vrchat_worlds(self, limit: int = 100, sort_by: str = 'popularity') -> List[Dict]:
        """VRChatワールドデータを取得"""
        if not self.db:
            logger.warning("Firebaseが初期化されていません。")
            return []
        
        try:
            collection_ref = self.db.collection('vrchat_worlds')
            
            # ソート条件を設定
            if sort_by == 'popularity':
                query = collection_ref.order_by('popularity', direction=firestore.Query.DESCENDING)
            elif sort_by == 'visits':
                query = collection_ref.order_by('visits', direction=firestore.Query.DESCENDING)
            elif sort_by == 'created_at':
                query = collection_ref.order_by('created_at', direction=firestore.Query.DESCENDING)
            else:
                query = collection_ref.order_by('updated_at', direction=firestore.Query.DESCENDING)
            
            docs = query.limit(limit).stream()
            
            results = []
            for doc in docs:
                data = doc.to_dict()
                data['id'] = doc.id
                results.append(data)
            
            logger.info(f"{len(results)}件のVRChatワールドデータを取得しました")
            return results
            
        except Exception as e:
            logger.error(f"VRChatワールドデータ取得エラー: {e}")
            return []
    
    def search_vrchat_worlds(self, keyword: str, limit: int = 50) -> List[Dict]:
        """キーワードでVRChatワールドを検索"""
        if not self.db:
            logger.warning("Firebaseが初期化されていません。")
            return []
        
        try:
            collection_ref = self.db.collection('vrchat_worlds')
            
            # Firestoreの制限により、クライアントサイドでフィルタリング
            docs = collection_ref.limit(1000).stream()  # より多くのデータを取得
            
            results = []
            keyword_lower = keyword.lower()
            
            for doc in docs:
                data = doc.to_dict()
                data['id'] = doc.id
                
                # 名前、説明、タグで検索
                name = data.get('name', '').lower()
                description = data.get('description', '').lower()
                tags = [tag.lower() for tag in data.get('tags', [])]
                
                if (keyword_lower in name or 
                    keyword_lower in description or 
                    any(keyword_lower in tag for tag in tags)):
                    results.append(data)
                    
                    if len(results) >= limit:
                        break
            
            logger.info(f"検索結果: {len(results)}件のワールドが見つかりました")
            return results
            
        except Exception as e:
            logger.error(f"VRChatワールド検索エラー: {e}")
            return []

    def get_stats(self) -> Dict:
        """データの統計情報を取得"""
        if not self.db:
            return {"error": "Firebase not initialized"}
        
        try:
            # 一般的なスクレイピングデータの統計
            collection_ref = self.db.collection('scraped_data')
            docs = collection_ref.stream()
            
            total_count = 0
            domains = {}
            
            for doc in docs:
                data = doc.to_dict()
                total_count += 1
                
                # ドメイン別の統計
                url = data.get('url', '')
                if url:
                    from urllib.parse import urlparse
                    domain = urlparse(url).netloc
                    domains[domain] = domains.get(domain, 0) + 1
            
            # VRChatワールドの統計
            vrchat_collection = self.db.collection('vrchat_worlds')
            vrchat_docs = vrchat_collection.stream()
            
            vrchat_count = 0
            for doc in vrchat_docs:
                vrchat_count += 1
            
            return {
                "total_scraped_data": total_count,
                "domains": domains,
                "vrchat_worlds": vrchat_count,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"統計取得エラー: {e}")
            return {"error": str(e)}
