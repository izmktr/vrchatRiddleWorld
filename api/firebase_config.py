"""
Vercel環境用のFirebase設定
環境変数からFirebase設定を読み込む
"""
import os
import json
from typing import List, Dict, Any
import firebase_admin
from firebase_admin import credentials, firestore

# グローバル変数
db = None
app = None

def initialize_firebase():
    """Firebase Admin SDKを初期化"""
    global db, app
    
    if app is not None:
        return db
    
    try:
        # 環境変数からFirebase設定を構築
        firebase_config = {
            "type": "service_account",
            "project_id": os.getenv('FIREBASE_PROJECT_ID'),
            "private_key_id": os.getenv('FIREBASE_PRIVATE_KEY_ID'),
            "private_key": os.getenv('FIREBASE_PRIVATE_KEY', '').replace('\\n', '\n'),
            "client_email": os.getenv('FIREBASE_CLIENT_EMAIL'),
            "client_id": os.getenv('FIREBASE_CLIENT_ID'),
            "auth_uri": os.getenv('FIREBASE_AUTH_URI', 'https://accounts.google.com/o/oauth2/auth'),
            "token_uri": os.getenv('FIREBASE_TOKEN_URI', 'https://oauth2.googleapis.com/token'),
            "auth_provider_x509_cert_url": os.getenv('FIREBASE_AUTH_PROVIDER_X509_CERT_URL', 'https://www.googleapis.com/oauth2/v1/certs'),
            "client_x509_cert_url": os.getenv('FIREBASE_CLIENT_X509_CERT_URL')
        }
        
        # 必須フィールドをチェック
        required_fields = ['project_id', 'private_key', 'client_email']
        for field in required_fields:
            if not firebase_config.get(field):
                print(f"Missing required Firebase config: {field}")
                return None
        
        # 認証情報を作成
        cred = credentials.Certificate(firebase_config)
        
        # Firebase Adminを初期化
        app = firebase_admin.initialize_app(cred)
        
        # Firestoreクライアントを取得
        db = firestore.client()
        
        print("Firebase initialized successfully for Vercel")
        return db
        
    except Exception as e:
        print(f"Firebase initialization error: {e}")
        return None

def get_all_worlds() -> List[Dict[str, Any]]:
    """全てのVRChatワールドデータを取得"""
    try:
        # Firebaseが初期化されていない場合は初期化
        if db is None:
            initialize_firebase()
        
        if db is None:
            print("Database not available")
            return []
        
        # vrchat_worldsコレクションから全てのドキュメントを取得
        worlds_ref = db.collection('vrchat_worlds')
        docs = worlds_ref.stream()
        
        worlds = []
        for doc in docs:
            world_data = doc.to_dict()
            world_data['id'] = doc.id  # ドキュメントIDを追加
            worlds.append(world_data)
        
        print(f"Retrieved {len(worlds)} worlds from Firebase")
        return worlds
        
    except Exception as e:
        print(f"Error fetching worlds: {e}")
        return []

def get_world_by_id(world_id: str) -> Dict[str, Any]:
    """指定されたIDのワールドデータを取得"""
    try:
        if db is None:
            initialize_firebase()
        
        if db is None:
            return {}
        
        doc_ref = db.collection('vrchat_worlds').document(world_id)
        doc = doc_ref.get()
        
        if doc.exists:
            world_data = doc.to_dict()
            world_data['id'] = doc.id
            return world_data
        else:
            return {}
            
    except Exception as e:
        print(f"Error fetching world {world_id}: {e}")
        return {}

# 初期化を試行
initialize_firebase()
