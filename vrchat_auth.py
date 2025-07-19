"""
VRChat API認証モジュール
ログイン、2FA認証、セッション管理を行う
"""

import requests
import time
import logging
import base64
import json
from typing import Dict, Optional, Tuple, Any
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
            'User-Agent': 'NazoWeb-VRChat-Scraper/1.0.0 (Python/3.13; Windows; https://github.com/nazoweb/vrchat-scraper) Contact: admin@nazoweb.dev',
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Accept-Language': 'en-US,en;q=0.9'
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
                
                # 2FA認証が必要かチェック
                if 'requiresTwoFactorAuth' in user_data and user_data['requiresTwoFactorAuth']:
                    logger.info("2FA認証が必要です")
                    print("🔐 2FA認証が有効になっています")
                    print("📧 VRChatから2FA認証メールが送信されているはずです")
                    
                    # 2FA認証時に必要なクッキーを保存
                    auth_cookie = response.cookies.get('auth')
                    if auth_cookie:
                        self.auth_cookie = auth_cookie
                    
                    # メール送信を試行（失敗してもOK）
                    self._request_two_factor_auth()
                    
                    # 2FA認証処理を実行
                    return self._handle_two_factor_auth()
                else:
                    self.current_user = user_data
                    logger.info(f"ログイン成功: {user_data.get('displayName', 'Unknown')}")
                    return True
                    
            else:
                logger.error(f"ログイン失敗: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"ログインエラー: {e}")
            return False
    
    def _request_two_factor_auth(self) -> bool:
        """
        2FA認証メールの送信を要求
        """
        try:
            # VRChat APIの正しい2FAエンドポイント
            request_url = urljoin(self.base_url, "auth/twofactorauth/emailotp/send")
            
            logger.info("2FA認証メールの送信を要求中...")
            response = self.session.post(request_url)
            
            if response.status_code == 200:
                logger.info("2FA認証メール送信要求成功")
                print("📧 2FA認証メールの送信を要求しました")
                return True
            elif response.status_code == 404:
                # エンドポイントが見つからない場合、別の方法を試す
                logger.info("emailotp/sendエンドポイントが見つからないため、代替方法を使用")
                print("📧 2FA認証が有効です（メールは自動送信されている可能性があります）")
                return True
            else:
                logger.error(f"2FA認証メール送信要求失敗: {response.status_code} - {response.text}")
                print(f"❌ 2FA認証メール送信要求失敗: {response.status_code}")
                # 失敗してもTrue返す（手動でメールが送信されている可能性）
                return True
                
        except Exception as e:
            logger.error(f"2FA認証メール送信要求エラー: {e}")
            return True  # エラーでもTrue返して続行
    
    def _handle_two_factor_auth(self) -> bool:
        """
        2FA認証を処理
        """
        try:
            # 環境変数から2FAコードを取得
            auth_code = os.getenv('VRCHAT_2FA_CODE')
            
            if not auth_code:
                # バッチ処理中の場合の対応
                print("\n" + "="*60)
                print("🔐 VRChat 2FA認証が必要です")
                print("="*60)
                print("📧 メールボックスを確認して、6桁のコードを探してください")
                print("💌 VRChatからの件名: 'VRChat Email Verification'")
                print("⏰ 認証コードは5分間有効です（最新のメールを確認してください）")
                print("")
                print("💡 認証コードを設定する2つの方法:")
                print("   1. 以下に直接入力")
                print("   2. .envファイルに 'VRCHAT_2FA_CODE=123456' を追加")
                print("")
                
                # インタラクティブな入力を試行
                try:
                    import sys
                    # 標準入力が利用可能かチェック
                    if sys.stdin.isatty():
                        while True:
                            try:
                                auth_code = input("📝 2FA認証コード (6桁): ").strip()
                                
                                if len(auth_code) == 6 and auth_code.isdigit():
                                    print(f"✅ コード '{auth_code}' を受け取りました")
                                    break
                                else:
                                    print("❌ 6桁の数字を入力してください")
                            except (KeyboardInterrupt, EOFError):
                                print("\n❌ 認証がキャンセルされました")
                                print("💡 .envファイルに VRCHAT_2FA_CODE=123456 を設定して再実行してください")
                                return False
                    else:
                        print("❌ インタラクティブモードが利用できません")
                        print("💡 .envファイルに VRCHAT_2FA_CODE=123456 を設定して再実行してください")
                        return False
                        
                except Exception as e:
                    logger.error(f"入力エラー: {e}")
                    print("❌ 入力処理でエラーが発生しました")
                    print("💡 .envファイルに VRCHAT_2FA_CODE=123456 を設定して再実行してください")
                    return False
            else:
                logger.info("環境変数から2FAコードを取得しました")
                print(f"🔐 2FAコード使用: {auth_code}")
            
            # 2FA認証リクエスト
            # VRChatの2FA認証エンドポイントを試す（複数のパターンがある）
            verify_endpoints = [
                "auth/twofactorauth/emailotp/verify",
                "auth/twofactorauth/totp/verify"
            ]
            
            data = {
                'code': auth_code
            }
            
            # Basic認証ヘッダーを維持
            credentials = base64.b64encode(f"{self.username}:{self.password}".encode()).decode()
            headers = {
                'Authorization': f'Basic {credentials}',
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
            
            logger.info("2FA認証コードを検証中...")
            print(f"🔍 認証コード '{auth_code}' を検証中...")
            
            # 複数のエンドポイントを試行
            for endpoint in verify_endpoints:
                verify_url = urljoin(self.base_url, endpoint)
                print(f"   試行中: {endpoint}")
                
                response = self.session.post(verify_url, json=data, headers=headers)
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get('verified', False):
                        logger.info(f"2FA認証成功 (エンドポイント: {endpoint})")
                        print("✅ 2FA認証成功！")
                        
                        # 再度ユーザー情報を取得
                        return self._get_current_user()
                    else:
                        logger.info(f"2FA認証レスポンスOKだが未検証 (エンドポイント: {endpoint}): {result}")
                        continue
                elif response.status_code == 404:
                    logger.info(f"エンドポイント {endpoint} は利用できません")
                    continue
                else:
                    logger.warning(f"2FA認証エラー (エンドポイント: {endpoint}): {response.status_code} - {response.text}")
                    continue
            
            # すべてのエンドポイントで失敗
            logger.error("すべての2FA認証エンドポイントで認証に失敗しました")
            print("❌ 2FA認証に失敗しました")
            print("💡 認証コードが正しいか、VRChatアカウントの2FA設定を確認してください")
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
            # Basic認証ヘッダーを含める
            credentials = base64.b64encode(f"{self.username}:{self.password}".encode()).decode()
            headers = {
                'Authorization': f'Basic {credentials}'
            }
            
            user_url = urljoin(self.base_url, "auth/user")
            response = self.session.get(user_url, headers=headers)
            
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
            if self.is_authenticated() and self.username and self.password:
                # Basic認証ヘッダーを含めてログアウト
                credentials = base64.b64encode(f"{self.username}:{self.password}".encode()).decode()
                headers = {
                    'Authorization': f'Basic {credentials}'
                }
                
                logout_url = urljoin(self.base_url, "logout")
                response = self.session.put(logout_url, headers=headers)
                
                if response.status_code == 200:
                    logger.info("ログアウト成功")
                else:
                    logger.info(f"ログアウト応答: {response.status_code} (認証状態に関わらずセッションをクリアします)")
            else:
                logger.info("認証されていないか認証情報が不足しています")
            
        except Exception as e:
            logger.info(f"ログアウト処理中にエラーが発生しましたが続行します: {e}")
        
        finally:
            # エラーの有無に関わらず、必ずセッション情報をクリア
            self.current_user = None
            self.auth_cookie = None
            self.two_factor_auth_cookie = None
            logger.info("セッション情報をクリアしました")
    
    def save_session(self, filepath: str) -> None:
        """セッション情報をファイルに保存"""
        try:
            # クッキーの重複を解決して辞書に変換
            cookies_dict: Dict[str, str] = {}
            for cookie in self.session.cookies:
                # 最新のクッキー値を保持（重複がある場合は最後の値を使用）
                if cookie.value is not None:
                    cookies_dict[cookie.name] = str(cookie.value)
            
            session_data: Dict[str, object] = {
                'cookies': cookies_dict,
                'current_user': self.current_user,
                'timestamp': time.time()
            }
            
            # ディレクトリが存在しない場合は作成
            os.makedirs(os.path.dirname(filepath), exist_ok=True)
            
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
                if isinstance(value, str):
                    self.session.cookies.set(name, value)  # type: ignore
            
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
