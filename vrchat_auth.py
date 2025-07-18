"""
VRChat API認証モジュール
ログイン、2FA認証、セッション管理を行う
"""

import requests
import time
import logging
import base64
import json
from typing import Dict, Optional, Tuple
from urllib.parse import urljoin
import os
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

class VRChatAuth:
    """VRChat API認証クラス"""
    
    def __init__(self):
        self.session = requests.Session()
        self.base_url = "https://api.vrchat.cloud/api/1/"
        self.auth_cookie = None
        self.two_factor_auth_cookie = None
        self.current_user = None
        
        # デフォルトヘッダー設定
        self.session.headers.update({
            'User-Agent': 'NazoWeb-VRChat-Scraper/1.0 (https://github.com/yourname/nazoweb; contact@example.com)',
            'Content-Type': 'application/json'
        })
        
        # 認証情報を環境変数から取得
        self.username = os.getenv('VRCHAT_USERNAME')
        self.password = os.getenv('VRCHAT_PASSWORD')
        
    def login(self, username: str = None, password: str = None) -> bool:
        """
        VRChatにログイン
        """
        try:
            # 認証情報の設定
            if username:
                self.username = username
            if password:
                self.password = password
                
            if not self.username or not self.password:
                logger.error("ユーザー名またはパスワードが設定されていません")
                return False
            
            # Basic認証用のエンコード
            credentials = base64.b64encode(f"{self.username}:{self.password}".encode()).decode()
            
            # ログインリクエスト
            login_url = urljoin(self.base_url, "auth/user")
            headers = {
                'Authorization': f'Basic {credentials}'
            }
            
            logger.info("VRChatにログイン試行中...")
            response = self.session.get(login_url, headers=headers)
            
            if response.status_code == 200:
                user_data = response.json()
                self.current_user = user_data
                logger.info(f"ログイン成功: {user_data.get('displayName', 'Unknown')}")
                return True
                
            elif response.status_code == 200 and 'requiresTwoFactorAuth' in response.text:
                logger.info("2FA認証が必要です")
                return self._handle_two_factor_auth()
                
            else:
                logger.error(f"ログイン失敗: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"ログインエラー: {e}")
            return False
    
    def _handle_two_factor_auth(self) -> bool:
        """
        2FA認証を処理
        """
        try:
            # 2FA認証コードの入力を求める
            while True:
                auth_code = input("2FA認証コードを入力してください (6桁): ").strip()
                
                if len(auth_code) == 6 and auth_code.isdigit():
                    break
                else:
                    print("6桁の数字を入力してください")
            
            # 2FA認証リクエスト
            verify_url = urljoin(self.base_url, "auth/twofactorauth/totp/verify")
            data = {
                'code': auth_code
            }
            
            logger.info("2FA認証コードを検証中...")
            response = self.session.post(verify_url, json=data)
            
            if response.status_code == 200:
                result = response.json()
                if result.get('verified', False):
                    logger.info("2FA認証成功")
                    
                    # 再度ユーザー情報を取得
                    return self._get_current_user()
                else:
                    logger.error("2FA認証に失敗しました")
                    return False
            else:
                logger.error(f"2FA認証エラー: {response.status_code} - {response.text}")
                return False
                
        except KeyboardInterrupt:
            logger.info("認証がキャンセルされました")
            return False
        except Exception as e:
            logger.error(f"2FA認証エラー: {e}")
            return False
    
    def _get_current_user(self) -> bool:
        """現在のユーザー情報を取得"""
        try:
            user_url = urljoin(self.base_url, "auth/user")
            response = self.session.get(user_url)
            
            if response.status_code == 200:
                self.current_user = response.json()
                logger.info(f"ユーザー情報取得成功: {self.current_user.get('displayName', 'Unknown')}")
                return True
            else:
                logger.error(f"ユーザー情報取得失敗: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"ユーザー情報取得エラー: {e}")
            return False
    
    def is_authenticated(self) -> bool:
        """認証状態をチェック"""
        return self.current_user is not None
    
    def get_authenticated_session(self) -> Optional[requests.Session]:
        """認証済みセッションを取得"""
        if self.is_authenticated():
            return self.session
        else:
            logger.warning("認証されていません")
            return None
    
    def logout(self):
        """ログアウト"""
        try:
            if self.is_authenticated():
                logout_url = urljoin(self.base_url, "logout")
                response = self.session.put(logout_url)
                
                if response.status_code == 200:
                    logger.info("ログアウト成功")
                else:
                    logger.warning(f"ログアウト失敗: {response.status_code}")
            
            # セッション情報をクリア
            self.current_user = None
            self.auth_cookie = None
            self.two_factor_auth_cookie = None
            
        except Exception as e:
            logger.error(f"ログアウトエラー: {e}")
    
    def save_session(self, filepath: str):
        """セッション情報をファイルに保存"""
        try:
            session_data = {
                'cookies': dict(self.session.cookies),
                'current_user': self.current_user,
                'timestamp': time.time()
            }
            
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(session_data, f, ensure_ascii=False, indent=2)
                
            logger.info(f"セッション情報を保存: {filepath}")
            
        except Exception as e:
            logger.error(f"セッション保存エラー: {e}")
    
    def load_session(self, filepath: str) -> bool:
        """セッション情報をファイルから読み込み"""
        try:
            if not os.path.exists(filepath):
                logger.info("セッションファイルが見つかりません")
                return False
            
            with open(filepath, 'r', encoding='utf-8') as f:
                session_data = json.load(f)
            
            # セッションの有効期限チェック（24時間）
            if time.time() - session_data.get('timestamp', 0) > 24 * 3600:
                logger.info("セッションが期限切れです")
                return False
            
            # Cookieを復元
            for name, value in session_data.get('cookies', {}).items():
                self.session.cookies.set(name, value)
            
            self.current_user = session_data.get('current_user')
            
            # 認証状態を確認
            if self._verify_session():
                logger.info("セッション復元成功")
                return True
            else:
                logger.info("セッション検証失敗")
                return False
                
        except Exception as e:
            logger.error(f"セッション読み込みエラー: {e}")
            return False
    
    def _verify_session(self) -> bool:
        """セッションの有効性を確認"""
        try:
            user_url = urljoin(self.base_url, "auth/user")
            response = self.session.get(user_url)
            
            if response.status_code == 200:
                user_data = response.json()
                if 'id' in user_data:
                    self.current_user = user_data
                    return True
            
            return False
            
        except Exception as e:
            logger.error(f"セッション検証エラー: {e}")
            return False
