"""
Firebase設定ライブラリ
"""

import os
import json
import logging
from datetime import datetime
from typing import Dict, Optional, Any
import firebase_admin
from firebase_admin import credentials, firestore
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

class FirebaseManager:
    """Firebase管理クラス"""
    
    def __init__(self):
        load_environment()
        self._db = None
        self._initialize_firebase()
    
    def _initialize_firebase(self):
        """Firebase初期化"""
        try:
            service_account_path = os.getenv('FIREBASE_SERVICE_ACCOUNT_PATH')
            
            if not service_account_path or not os.path.exists(service_account_path):
                logger.error("❌ Firebase設定ファイルが見つかりません")
                return
            
            if not firebase_admin._apps:
                cred = credentials.Certificate(service_account_path)
                firebase_admin.initialize_app(cred)
            
            self._db = firestore.client()
            logger.info("✅ Firebase接続成功")
            
        except Exception as e:
            logger.error(f"❌ Firebase初期化エラー: {e}")
            self._db = None
    
    def is_connected(self) -> bool:
        """接続状態確認"""
        return self._db is not None
    
    def save_world_data(self, world_data: Dict[str, Any]) -> bool:
        """ワールドデータを保存"""
        try:
            if not self.is_connected():
                return False
            
            world_id = world_data.get('id')
            if not world_id:
                return False
            
            # Firestoreに保存
            doc_ref = self._db.collection('vrchat_worlds').document(world_id)
            doc_ref.set({
                **world_data,
                'updated_at': datetime.now(),
                'created_at': world_data.get('created_at', datetime.now())
            })
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Firebase保存エラー: {e}")
            return False
    
    def get_stats(self) -> Dict[str, Any]:
        """統計情報取得"""
        try:
            if not self.is_connected():
                return {'total': 0, 'connected': False}
            
            # Firestoreのドキュメント数を取得
            docs = self._db.collection('vrchat_worlds').stream()
            total = sum(1 for _ in docs)
            
            return {'total': total, 'connected': True}
            
        except Exception as e:
            logger.error(f"❌ 統計取得エラー: {e}")
            return {'total': 0, 'connected': False}
