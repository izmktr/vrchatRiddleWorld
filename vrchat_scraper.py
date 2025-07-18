"""
VRChatワールドデータスクレイピング
認証付きでワールド情報を取得する
"""

import time
import logging
import json
from typing import List, Dict, Optional
from datetime import datetime
from urllib.parse import urljoin
import requests

from vrchat_auth import VRChatAuth
from firebase_config import FirebaseManager

logger = logging.getLogger(__name__)

class VRChatWorldScraper:
    """VRChatワールドデータスクレイピングクラス"""
    
    def __init__(self):
        self.auth = VRChatAuth()
        self.firebase_manager = FirebaseManager()
        self.base_url = "https://api.vrchat.cloud/api/1/"
        self.session_file = "config/vrchat_session.json"
        
    def ensure_authenticated(self) -> bool:
        """認証状態を確保"""
        # 既存のセッションを試行
        if self.auth.load_session(self.session_file):
            logger.info("既存のセッションを使用")
            return True
        
        # 新規ログイン
        logger.info("新規ログインが必要です")
        if self.auth.login():
            # セッションを保存
            self.auth.save_session(self.session_file)
            return True
        
        return False
    
    def search_worlds(self, 
                     search: str = "",
                     featured: bool = False,
                     sort: str = "popularity",
                     user: str = "me",
                     number: int = 60,
                     offset: int = 0) -> List[Dict]:
        """
        ワールドを検索
        
        Args:
            search: 検索キーワード
            featured: フィーチャーされたワールドのみ
            sort: ソート方法 (popularity, heat, trust, shuffle, random, favorites, 
                  reportScore, reportCount, publicationDate, labsPublicationDate, 
                  created, _created_at, updated, _updated_at, order, relevance)
            user: ユーザーフィルター
            number: 取得数 (最大100)
            offset: オフセット
        """
        if not self.ensure_authenticated():
            logger.error("認証に失敗しました")
            return []
        
        try:
            session = self.auth.get_authenticated_session()
            if not session:
                return []
            
            # APIエンドポイント
            url = urljoin(self.base_url, "worlds")
            
            # パラメータ設定
            params = {
                'n': min(number, 100),  # 最大100に制限
                'offset': offset,
                'sort': sort,
                'user': user
            }
            
            if search:
                params['search'] = search
            if featured:
                params['featured'] = 'true'
            
            logger.info(f"ワールド検索: {params}")
            response = session.get(url, params=params)
            
            if response.status_code == 200:
                worlds_data = response.json()
                logger.info(f"{len(worlds_data)}件のワールドを取得")
                return worlds_data
            else:
                logger.error(f"ワールド検索エラー: {response.status_code} - {response.text}")
                return []
                
        except Exception as e:
            logger.error(f"ワールド検索例外: {e}")
            return []
    
    def get_world_details(self, world_id: str) -> Optional[Dict]:
        """
        特定のワールドの詳細情報を取得
        """
        if not self.ensure_authenticated():
            return None
        
        try:
            session = self.auth.get_authenticated_session()
            if not session:
                return None
            
            url = urljoin(self.base_url, f"worlds/{world_id}")
            
            logger.info(f"ワールド詳細取得: {world_id}")
            response = session.get(url)
            
            if response.status_code == 200:
                world_data = response.json()
                logger.info(f"ワールド詳細取得成功: {world_data.get('name', 'Unknown')}")
                return world_data
            else:
                logger.error(f"ワールド詳細取得エラー: {response.status_code}")
                return None
                
        except Exception as e:
            logger.error(f"ワールド詳細取得例外: {e}")
            return None
    
    def get_world_instances(self, world_id: str) -> List[Dict]:
        """
        ワールドのインスタンス情報を取得
        """
        if not self.ensure_authenticated():
            return []
        
        try:
            session = self.auth.get_authenticated_session()
            if not session:
                return []
            
            url = urljoin(self.base_url, f"worlds/{world_id}/instances")
            
            logger.info(f"ワールドインスタンス取得: {world_id}")
            response = session.get(url)
            
            if response.status_code == 200:
                instances_data = response.json()
                logger.info(f"{len(instances_data)}個のインスタンスを取得")
                return instances_data
            else:
                logger.error(f"インスタンス取得エラー: {response.status_code}")
                return []
                
        except Exception as e:
            logger.error(f"インスタンス取得例外: {e}")
            return []
    
    def process_world_data(self, world_data: Dict) -> Dict:
        """
        ワールドデータを処理してFirebase用の形式に変換
        """
        processed_data = {
            'world_id': world_data.get('id', ''),
            'name': world_data.get('name', ''),
            'description': world_data.get('description', ''),
            'author_name': world_data.get('authorName', ''),
            'author_id': world_data.get('authorId', ''),
            'capacity': world_data.get('capacity', 0),
            'recommended_capacity': world_data.get('recommendedCapacity', 0),
            'visits': world_data.get('visits', 0),
            'popularity': world_data.get('popularity', 0),
            'heat': world_data.get('heat', 0),
            'favorites': world_data.get('favorites', 0),
            'publication_date': world_data.get('publicationDate', ''),
            'labs_publication_date': world_data.get('labsPublicationDate', ''),
            'created_at': world_data.get('created_at', ''),
            'updated_at': world_data.get('updated_at', ''),
            'version': world_data.get('version', 0),
            'unity_version': world_data.get('unityVersion', ''),
            'release_status': world_data.get('releaseStatus', ''),
            'tags': world_data.get('tags', []),
            'image_url': world_data.get('imageUrl', ''),
            'thumbnail_image_url': world_data.get('thumbnailImageUrl', ''),
            'namespace': world_data.get('namespace', ''),
            'platform': world_data.get('platform', ''),
            'scraped_at': datetime.now().isoformat(),
            'instances': []  # 後で追加される
        }
        
        return processed_data
    
    def scrape_popular_worlds(self, count: int = 100) -> List[Dict]:
        """
        人気ワールドをスクレイピング
        """
        logger.info(f"人気ワールド {count}件のスクレイピングを開始")
        
        all_worlds = []
        processed_count = 0
        offset = 0
        batch_size = 60  # VRChat APIの制限
        
        while processed_count < count:
            remaining = min(batch_size, count - processed_count)
            
            worlds = self.search_worlds(
                sort="popularity",
                number=remaining,
                offset=offset
            )
            
            if not worlds:
                logger.warning("これ以上のワールドデータを取得できません")
                break
            
            for world in worlds:
                try:
                    # 詳細情報を取得
                    detailed_world = self.get_world_details(world['id'])
                    if detailed_world:
                        processed_world = self.process_world_data(detailed_world)
                        
                        # インスタンス情報も取得
                        instances = self.get_world_instances(world['id'])
                        processed_world['instances'] = instances
                        
                        all_worlds.append(processed_world)
                        
                        # Firebaseに保存
                        try:
                            self.firebase_manager.save_vrchat_world_data(processed_world)
                            logger.info(f"Firebase保存完了: {processed_world['name']}")
                        except Exception as e:
                            logger.error(f"Firebase保存エラー: {e}")
                        
                        processed_count += 1
                        
                        # レート制限対応
                        time.sleep(0.5)  # 500ms待機
                        
                    if processed_count >= count:
                        break
                        
                except Exception as e:
                    logger.error(f"ワールド処理エラー: {e}")
                    continue
            
            offset += len(worlds)
            
            # 次のバッチ前に少し待機
            time.sleep(1.0)
        
        logger.info(f"スクレイピング完了: {len(all_worlds)}件のワールドデータを収集")
        return all_worlds
    
    def scrape_featured_worlds(self) -> List[Dict]:
        """
        フィーチャーされたワールドをスクレイピング
        """
        logger.info("フィーチャーワールドのスクレイピングを開始")
        
        worlds = self.search_worlds(featured=True, number=100)
        processed_worlds = []
        
        for world in worlds:
            try:
                detailed_world = self.get_world_details(world['id'])
                if detailed_world:
                    processed_world = self.process_world_data(detailed_world)
                    processed_worlds.append(processed_world)
                    
                    # Firebaseに保存
                    try:
                        self.firebase_manager.save_vrchat_world_data(processed_world)
                        logger.info(f"Firebase保存完了: {processed_world['name']}")
                    except Exception as e:
                        logger.error(f"Firebase保存エラー: {e}")
                    
                    time.sleep(0.5)
                    
            except Exception as e:
                logger.error(f"フィーチャーワールド処理エラー: {e}")
                continue
        
        logger.info(f"フィーチャーワールドスクレイピング完了: {len(processed_worlds)}件")
        return processed_worlds
    
    def search_worlds_by_keyword(self, keyword: str, count: int = 50) -> List[Dict]:
        """
        キーワードでワールドを検索してスクレイピング
        """
        logger.info(f"キーワード '{keyword}' でワールド検索")
        
        worlds = self.search_worlds(search=keyword, number=count)
        processed_worlds = []
        
        for world in worlds:
            try:
                processed_world = self.process_world_data(world)
                processed_worlds.append(processed_world)
                
                # Firebaseに保存
                try:
                    self.firebase_manager.save_vrchat_world_data(processed_world)
                    logger.info(f"Firebase保存完了: {processed_world['name']}")
                except Exception as e:
                    logger.error(f"Firebase保存エラー: {e}")
                
                time.sleep(0.5)
                
            except Exception as e:
                logger.error(f"キーワード検索ワールド処理エラー: {e}")
                continue
        
        logger.info(f"キーワード検索完了: {len(processed_worlds)}件")
        return processed_worlds
    
    def cleanup(self):
        """クリーンアップ処理"""
        if self.auth:
            self.auth.logout()

def main():
    """テスト実行用のメイン関数"""
    scraper = VRChatWorldScraper()
    
    try:
        # 人気ワールドを20件取得
        worlds = scraper.scrape_popular_worlds(count=20)
        print(f"\n取得したワールド数: {len(worlds)}")
        
        for i, world in enumerate(worlds[:5], 1):
            print(f"{i}. {world['name']} (訪問: {world['visits']}, 人気: {world['popularity']})")
            
    except KeyboardInterrupt:
        print("\n処理が中断されました")
    except Exception as e:
        print(f"エラー: {e}")
    finally:
        scraper.cleanup()

if __name__ == "__main__":
    main()
