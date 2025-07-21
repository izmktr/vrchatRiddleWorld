"""
Firebase設定とデータベース操作
"""

import os
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
from google.cloud import firestore  # type: ignore
import firebase_admin  # type: ignore
from firebase_admin import credentials, firestore as admin_firestore  # type: ignore
from dotenv import load_dotenv

# 環境変数の読み込み
load_dotenv()

logger = logging.getLogger(__name__)

class FirebaseManager:
    """Firebase Firestoreとの連携を管理するクラス"""
    
    def __init__(self):
        self.db = None
        self.initialize_firebase()
    
    def initialize_firebase(self):
        """Firebase Admin SDKの初期化"""
        try:
            # 環境変数からFirebase設定を取得
            project_id = os.getenv('FIREBASE_PROJECT_ID')
            service_account_path = os.getenv('FIREBASE_SERVICE_ACCOUNT_PATH')
            database_name = os.getenv('FIREBASE_DATABASE_NAME', '(default)')
            
            logger.info(f"Firebase初期化開始 - Project ID: {project_id}, Database: {database_name}")
            
            if service_account_path and os.path.exists(service_account_path):
                # サービスアカウントキーファイルを使用
                cred = credentials.Certificate(service_account_path)
                if not firebase_admin._apps:  # type: ignore
                    firebase_admin.initialize_app(cred, {  # type: ignore
                        'projectId': project_id
                    })
                # Firestoreクライアント取得
                self.db = admin_firestore.client()
                logger.info(f"Firebase Admin SDK初期化完了（サービスアカウント使用、DB: {database_name}）")
            
            elif project_id:
                # プロジェクトIDのみでの初期化
                if not firebase_admin._apps:  # type: ignore
                    firebase_admin.initialize_app(options={  # type: ignore
                        'projectId': project_id
                    })
                self.db = admin_firestore.client()
                logger.info("Firebase Admin SDK初期化完了（プロジェクトID使用）")
            
            else:
                logger.warning("Firebase設定が見つかりません。FIREBASE_PROJECT_IDを.envファイルで設定してください。")
                self.db = None
                
        except Exception as e:
            logger.error(f"Firebase初期化エラー: {e}")
            self.db = None
    
    def is_initialized(self) -> bool:
        """Firebase初期化状況を確認"""
        return self.db is not None
    
    def save_scraped_data(self, data: Dict[str, Any]) -> bool:
        """スクレイピングデータをFirestoreに保存"""
        if not self.db:
            logger.warning("Firebaseが初期化されていません。データを保存できません。")
            return False
        
        try:
            # コレクション名を設定
            collection_ref = self.db.collection('scraped_data')
            
            # ドキュメントIDをURLのハッシュにする（重複回避）
            import hashlib
            doc_id = hashlib.md5(str(data['url']).encode()).hexdigest()  # type: ignore
            
            # タイムスタンプを追加
            data['created_at'] = firestore.SERVER_TIMESTAMP
            data['updated_at'] = firestore.SERVER_TIMESTAMP
            
            # データを保存
            collection_ref.document(doc_id).set(data, merge=True)  # type: ignore
            logger.info(f"データ保存完了: {data.get('title', 'タイトルなし')}")  # type: ignore
            return True
            
        except Exception as e:
            logger.error(f"データ保存エラー: {e}")
            return False
    
    def get_scraped_data(self, limit: int = 100) -> List[Dict[str, Any]]:
        """保存されたスクレイピングデータを取得"""
        if not self.db:
            logger.warning("Firebaseが初期化されていません。")
            return []
        
        try:
            collection_ref = self.db.collection('scraped_data')
            docs = collection_ref.order_by('created_at', direction=firestore.Query.DESCENDING).limit(limit).stream()  # type: ignore
            
            results: List[Dict[str, Any]] = []
            for doc in docs:  # type: ignore
                data: Dict[str, Any] = doc.to_dict()  # type: ignore
                data['id'] = doc.id  # type: ignore
                results.append(data)  # type: ignore
            
            logger.info(f"{len(results)}件のデータを取得しました")  # type: ignore
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
            query = collection_ref.where('created_at', '<', cutoff_date)  # type: ignore
            
            deleted_count = 0
            for doc in query.stream():  # type: ignore
                doc.reference.delete()  # type: ignore
                deleted_count += 1
            
            logger.info(f"{deleted_count}件の古いデータを削除しました")
            return deleted_count
            
        except Exception as e:
            logger.error(f"データ削除エラー: {e}")
            return 0
    
    def save_vrchat_world_data(self, world_data: Dict[str, Any]) -> bool:
        """VRChatワールドデータをFirestoreに保存"""
        if not self.db:
            logger.warning("Firebaseが初期化されていません。データを保存できません。")
            return False
        
        try:
            # VRChatワールド用のコレクション
            collection_ref = self.db.collection('vrchat_worlds')
            
            # ドキュメントIDをidにする
            doc_id = world_data.get('id', '')
            if not doc_id:
                logger.error("idが見つかりません")
                return False
            
            # タイムスタンプを追加
            world_data['created_at'] = firestore.SERVER_TIMESTAMP
            world_data['updated_at'] = firestore.SERVER_TIMESTAMP
            
            # データを保存（既存データがあれば更新）
            collection_ref.document(doc_id).set(world_data, merge=True)  # type: ignore
            logger.info(f"VRChatワールドデータ保存完了: {world_data.get('name', 'Unknown')}")
            return True
            
        except Exception as e:
            logger.error(f"VRChatワールドデータ保存エラー: {e}")
            return False
    
    def get_vrchat_worlds(self, limit: int = 50, sort_by: str = 'popularity') -> List[Dict[str, Any]]:
        """VRChatワールドデータを取得（読み取り最適化版）"""
        if not self.db:
            logger.warning("Firebaseが初期化されていません。")
            return []
        
        try:
            collection_ref = self.db.collection('vrchat_worlds')
            logger.info(f"VRChatワールドデータ取得開始: limit={limit}, sort_by={sort_by}")
            
            # 読み取り数を制限してデータを取得
            docs = collection_ref.limit(limit).stream()
            
            results: List[Dict[str, Any]] = []
            for doc in docs:  # type: ignore
                data: Dict[str, Any] = doc.to_dict()  # type: ignore
                data['id'] = doc.id  # type: ignore
                results.append(data)  # type: ignore
            
            logger.info(f"{len(results)}件のVRChatワールドデータを取得しました（読み取り数: {len(results)}）")  # type: ignore
            
            return results
            
        except Exception as e:
            logger.error(f"VRChatワールドデータ取得エラー: {e}")
            return []
    
    def get_all_vrchat_worlds(self) -> List[Dict[str, Any]]:
        """全てのVRChatワールドデータを取得（制限なし）"""
        if not self.db:
            logger.warning("Firebaseが初期化されていません。")
            return []
        
        try:
            collection_ref = self.db.collection('vrchat_worlds')
            logger.info("全VRChatワールドデータ取得開始（制限なし）")
            
            # 制限なしで全データを取得
            docs = collection_ref.stream()
            
            results: List[Dict[str, Any]] = []
            count = 0
            for doc in docs:  # type: ignore
                data: Dict[str, Any] = doc.to_dict()  # type: ignore
                data['id'] = doc.id  # type: ignore
                results.append(data)  # type: ignore
                count += 1
                
                # 進行状況を1000件ごとに表示
                if count % 1000 == 0:
                    logger.info(f"読み込み中... {count}件")
            
            logger.info(f"{len(results)}件の全VRChatワールドデータを取得しました（読み取り数: {len(results)}）")  # type: ignore
            
            return results
            
        except Exception as e:
            logger.error(f"全VRChatワールドデータ取得エラー: {e}")
            return []
    
    def search_vrchat_worlds(self, keyword: str, limit: int = 50) -> List[Dict[str, Any]]:
        """キーワードでVRChatワールドを検索（読み取り最適化版）"""
        if not self.db:
            logger.warning("Firebaseが初期化されていません。")
            return []
        
        try:
            collection_ref = self.db.collection('vrchat_worlds')
            
            # Firestoreの制限により、クライアントサイドでフィルタリング
            # ただし読み取り数を制限（検索の場合は最大200件まで）
            max_docs_to_search = min(200, limit * 4)  # 検索効率を考慮して制限
            docs = collection_ref.limit(max_docs_to_search).stream()
            
            results: List[Dict[str, Any]] = []
            keyword_lower = keyword.lower()
            docs_processed = 0
            
            for doc in docs:  # type: ignore
                docs_processed += 1
                data: Dict[str, Any] = doc.to_dict()  # type: ignore
                data['id'] = doc.id  # type: ignore
                
                # 名前、説明、タグで検索
                name: str = str(data.get('name', '')).lower()  # type: ignore
                description: str = str(data.get('description', '')).lower()  # type: ignore
                tags: List[str] = [str(tag).lower() for tag in data.get('tags', [])]  # type: ignore
                
                if (keyword_lower in name or 
                    keyword_lower in description or 
                    any(keyword_lower in tag for tag in tags)):  # type: ignore
                    results.append(data)  # type: ignore
                    
                    if len(results) >= limit:  # type: ignore
                        break
            
            logger.info(f"検索結果: {len(results)}件のワールドが見つかりました（読み取り数: {docs_processed}）")  # type: ignore
            return results
            
        except Exception as e:
            logger.error(f"VRChatワールド検索エラー: {e}")
            return []

    def get_stats(self) -> Dict[str, Any]:
        """データの統計情報を取得（読み取り最適化版）"""
        if not self.db:
            return {"error": "Firebase not initialized"}
        
        try:
            # 統計は最小限のデータのみ取得
            # VRChatワールドの数のみ取得（全データを読み取らない）
            vrchat_collection = self.db.collection('vrchat_worlds')
            
            # 統計情報は簡略化（読み取り数削減のため）
            # 実際のカウントではなく、限定されたサンプル数で概算
            sample_size = 10  # サンプルサイズを大幅に削減
            sample_docs = list(vrchat_collection.limit(sample_size).stream())
            
            # サンプルから統計を推定
            sample_count = len(sample_docs)
            
            return {
                "total_worlds": sample_count,
                "note": f"統計は最新{sample_size}件のサンプルに基づく概算です",
                "timestamp": datetime.now().isoformat(),
                "reads_used": sample_size  # 実際の読み取り数を記録
            }
            
        except Exception as e:
            logger.error(f"統計取得エラー: {e}")
            return {
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    def get_vrchat_world_by_id(self, world_id: str) -> Optional[Dict[str, Any]]:
        """指定されたIDのVRChatワールドを取得"""
        try:
            if not self.db:
                return None
                
            doc_ref = self.db.collection('vrchat_worlds').document(world_id)
            doc = doc_ref.get()  # type: ignore
            
            if doc.exists:
                data = doc.to_dict()
                if data:
                    data['id'] = doc.id  # type: ignore
                    return data
            return None
                
        except Exception as e:
            logger.error(f"VRChatワールド取得エラー (ID: {world_id}): {e}")
            return None
    
    def update_vrchat_world(self, world_id: str, update_data: Dict[str, Any]) -> bool:
        """VRChatワールドデータを更新"""
        try:
            if not self.db:
                return False
                
            # 更新日時を自動追加
            update_data['updated_at'] = firestore.SERVER_TIMESTAMP
            
            doc_ref = self.db.collection('vrchat_worlds').document(world_id)
            doc_ref.update(update_data)  # type: ignore
            
            logger.info(f"VRChatワールド更新完了 (ID: {world_id})")
            return True
            
        except Exception as e:
            logger.error(f"VRChatワールド更新エラー (ID: {world_id}): {e}")
            return False
    
    def delete_vrchat_world(self, world_id: str) -> bool:
        """VRChatワールドデータを削除"""
        try:
            if not self.db:
                return False
                
            doc_ref = self.db.collection('vrchat_worlds').document(world_id)
            doc_ref.delete()
            
            logger.info(f"VRChatワールド削除完了 (ID: {world_id})")
            return True
            
        except Exception as e:
            logger.error(f"VRChatワールド削除エラー (ID: {world_id}): {e}")
            return False
