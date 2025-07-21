"""
VRChatワールドデータスクレイピング
認証付きでワールド情報を取得する
"""

import time
import logging
import json
import os
from typing import List, Dict, Optional, Any
from datetime import datetime
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup
import re

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
        self.thumbnail_dir = "thumbnail"
        
        # サムネイル統計カウンター
        self.thumbnail_downloaded = 0
        self.thumbnail_skipped = 0
        self.thumbnail_failed = 0
        
        # サムネイルディレクトリを作成
        os.makedirs(self.thumbnail_dir, exist_ok=True)
        
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
    
    def download_thumbnail(self, thumbnail_url: str, world_id: str) -> Optional[str]:
        """
        サムネイル画像をダウンロードしてローカルに保存
        """
        if not thumbnail_url or thumbnail_url == '':
            logger.warning(f"サムネイルURLが空です: {world_id}")
            return None
            
        try:
            # ファイル名を生成（ワールドID + 拡張子）
            parsed_url = urlparse(thumbnail_url)
            file_extension = '.jpg'  # VRChatサムネイルは通常jpg
            if '.' in parsed_url.path:
                file_extension = '.' + parsed_url.path.split('.')[-1]
            
            filename = f"{world_id}{file_extension}"
            filepath = os.path.join(self.thumbnail_dir, filename)
            
            # 既にファイルが存在する場合はスキップ（ただし0バイトファイルは再ダウンロード）
            if os.path.exists(filepath):
                file_size = os.path.getsize(filepath)
                if file_size > 0:
                    logger.info(f"⏭️ サムネイル既存のためスキップ: {filename} ({file_size} bytes)")
                    self.thumbnail_skipped += 1
                    return filepath
                else:
                    logger.warning(f"⚠️ 破損ファイル検出（0 bytes）、再ダウンロードします: {filename}")
                    os.remove(filepath)
            
            # 画像をダウンロード
            logger.info(f"サムネイルダウンロード中: {thumbnail_url}")
            session = self.auth.get_authenticated_session()
            if not session:
                logger.error("認証されたセッションが取得できません")
                return None
                
            response = session.get(thumbnail_url, timeout=30)
            response.raise_for_status()
            
            # ファイルに保存
            with open(filepath, 'wb') as f:
                f.write(response.content)
            
            logger.info(f"✅ サムネイル保存完了: {filename} ({len(response.content)} bytes)")
            self.thumbnail_downloaded += 1
            return filepath
            
        except Exception as e:
            logger.error(f"❌ サムネイルダウンロードエラー {world_id}: {e}")
            self.thumbnail_failed += 1
            return None
    
    def print_thumbnail_stats(self):
        """サムネイル統計を出力"""
        total = self.thumbnail_downloaded + self.thumbnail_skipped + self.thumbnail_failed
        
        if total > 0:
            logger.info(f"\n🖼️ サムネイル統計:")
            logger.info(f"・ダウンロード完了: {self.thumbnail_downloaded} 件")
            logger.info(f"・スキップ済み: {self.thumbnail_skipped} 件")
            logger.info(f"・失敗: {self.thumbnail_failed} 件")
            logger.info(f"・成功率: {((self.thumbnail_downloaded + self.thumbnail_skipped) / total * 100):.1f}%")
    
    def reset_thumbnail_stats(self):
        """サムネイル統計をリセット"""
        self.thumbnail_downloaded = 0
        self.thumbnail_skipped = 0
        self.thumbnail_failed = 0
    
    def search_worlds(self, 
                     search: str = "",
                     featured: bool = False,
                     sort: str = "popularity",
                     user: str = "me",
                     number: int = 60,
                     offset: int = 0) -> List[Dict[str, Any]]:
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
            params: Dict[str, Any] = {
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
    
    def get_world_details(self, world_id: str) -> Optional[Dict[str, Any]]:
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
    
    def get_world_instances(self, world_id: str) -> List[Dict[str, Any]]:
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
    
    def process_world_data(self, world_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        ワールドデータを処理してFirebase用の形式に変換
        """
        processed_data: Dict[str, Any] = {
            'id': world_data.get('id', ''),
            'name': world_data.get('name', ''),
            'description': world_data.get('description', ''),
            'authorName': world_data.get('authorName', ''),
            'authorId': world_data.get('authorId', ''),
            'capacity': world_data.get('capacity', 0),
            'recommendedCapacity': world_data.get('recommendedCapacity', 0),
            'visits': world_data.get('visits', 0),
            'popularity': world_data.get('popularity', 0),
            'heat': world_data.get('heat', 0),
            'favorites': world_data.get('favorites', 0),
            'publicationDate': world_data.get('publicationDate', ''),
            'labsPublicationDate': world_data.get('labsPublicationDate', ''),
            'created_at': world_data.get('created_at', ''),
            'updated_at': world_data.get('updated_at', ''),
            'version': world_data.get('version', 0),
            'releaseStatus': world_data.get('releaseStatus', ''),
            'platform': world_data.get('platform', ''),
            'imageUrl': world_data.get('imageUrl', ''),
            'thumbnailImageUrl': world_data.get('thumbnailImageUrl', ''),
            'tags': world_data.get('tags', []),
            'scraped_at': datetime.now().isoformat(),
            'instances': []  # 後で追加される
        }
        
        return processed_data
    
    def scrape_popular_worlds(self, count: int = 100) -> List[Dict[str, Any]]:
        """
        人気ワールドをスクレイピング
        """
        logger.info(f"人気ワールド {count}件のスクレイピングを開始")
        
        all_worlds: List[Dict[str, Any]] = []
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
        self.print_thumbnail_stats()
        return all_worlds
    
    def scrape_featured_worlds(self) -> List[Dict[str, Any]]:
        """
        フィーチャーされたワールドをスクレイピング
        """
        logger.info("フィーチャーワールドのスクレイピングを開始")
        
        worlds = self.search_worlds(featured=True, number=100)
        processed_worlds: List[Dict[str, Any]] = []
        
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
    
    def search_worlds_by_keyword(self, keyword: str, count: int = 50) -> List[Dict[str, Any]]:
        """
        キーワードでワールドを検索してスクレイピング
        """
        logger.info(f"キーワード '{keyword}' でワールド検索")
        
        worlds = self.search_worlds(search=keyword, number=count)
        processed_worlds: List[Dict[str, Any]] = []
        
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

    def scrape_world_page(self, world_id: str) -> Optional[Dict[str, Any]]:
        """
        VRChatワールドページから詳細情報をスクレイピング
        """
        if not self.ensure_authenticated():
            return None
        
        try:
            session = self.auth.get_authenticated_session()
            if not session:
                return None
            
            # VRChatのワールドページURL
            world_url = f"https://vrchat.com/home/world/{world_id}"
            
            logger.info(f"ワールドページスクレイピング: {world_url}")
            
            # WebページのHTMLを取得
            response = session.get(world_url)
            
            if response.status_code != 200:
                logger.error(f"ワールドページアクセスエラー: {response.status_code}")
                return None
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # ワールド情報を抽出
            world_info = self._extract_world_info(soup, world_id)
            
            if world_info:
                logger.info(f"ワールド情報抽出成功: {world_info.get('title', 'Unknown')}")
                return world_info
            else:
                logger.warning("ワールド情報の抽出に失敗しました")
                return None
                
        except Exception as e:
            logger.error(f"ワールドページスクレイピング例外: {e}")
            return None
    
    def _extract_world_info(self, soup: BeautifulSoup, world_id: str) -> Optional[Dict[str, Any]]:
        """
        HTMLからワールド情報を抽出
        """
        try:
            world_info: Dict[str, Any] = {
                'world_id': world_id,
                'title': '',
                'creator': '',
                'thumbnail_url': '',
                'description': '',
                'capacity': '',
                'published': '',
                'scraped_at': datetime.now().isoformat()
            }
            
            # タイトルを抽出
            title_element = soup.find('h1') or soup.find('title')
            if title_element:
                world_info['title'] = title_element.get_text(strip=True)
            
            # 制作者を抽出
            creator_element = soup.find('a', class_='user-link') or soup.find('span', class_='author')
            if creator_element:
                world_info['creator'] = creator_element.get_text(strip=True)
            
            # サムネイル画像URLを抽出
            thumbnail_element = soup.find('img', class_='world-image') or soup.find('img', {'alt': re.compile(r'world|thumbnail', re.I)})
            if thumbnail_element and hasattr(thumbnail_element, 'get'):
                thumbnail_src = thumbnail_element.get('src')  # type: ignore
                world_info['thumbnail_url'] = str(thumbnail_src) if thumbnail_src else ''  # type: ignore
            
            # Descriptionを抽出
            description_element = soup.find('div', class_='description') or soup.find('p', class_='world-description')
            if description_element:
                world_info['description'] = description_element.get_text(strip=True)
            
            # メタデータから情報を抽出
            meta_elements = soup.find_all('meta')
            for meta in meta_elements:
                try:
                    property_attr = meta.attrs.get('property', '') if hasattr(meta, 'attrs') else ''  # type: ignore
                    name_attr = meta.attrs.get('name', '') if hasattr(meta, 'attrs') else ''  # type: ignore
                    content_attr = meta.attrs.get('content', '') if hasattr(meta, 'attrs') else ''  # type: ignore
                    
                    property_name = str(property_attr).lower() if property_attr else ''  # type: ignore
                    name = str(name_attr).lower() if name_attr else ''  # type: ignore
                    content = str(content_attr) if content_attr else ''  # type: ignore
                    
                    if 'title' in property_name or 'title' in name:
                        if not world_info['title']:
                            world_info['title'] = content
                    elif 'description' in property_name or 'description' in name:
                        if not world_info['description']:
                            world_info['description'] = content
                    elif 'image' in property_name or 'image' in name:
                        if not world_info['thumbnail_url']:
                            world_info['thumbnail_url'] = content
                except (AttributeError, TypeError):
                    continue
            
            # JSON-LDスクリプトから情報を抽出
            json_ld_scripts = soup.find_all('script', type='application/ld+json')
            for script in json_ld_scripts:
                try:
                    script_text = script.string if hasattr(script, 'string') and script.string else ''  # type: ignore
                    if script_text:
                        data = json.loads(str(script_text))  # type: ignore
                        if isinstance(data, dict):
                            if 'name' in data and not world_info['title']:
                                world_info['title'] = str(data['name'])  # type: ignore
                            if 'description' in data and not world_info['description']:
                                world_info['description'] = str(data['description'])  # type: ignore
                            if 'image' in data and not world_info['thumbnail_url']:
                                world_info['thumbnail_url'] = str(data['image'])  # type: ignore
                            if 'author' in data and not world_info['creator']:
                                author = data['author']  # type: ignore
                                if isinstance(author, dict):
                                    world_info['creator'] = str(author.get('name', ''))  # type: ignore
                                else:
                                    world_info['creator'] = str(author)  # type: ignore
                except (json.JSONDecodeError, AttributeError, TypeError):
                    continue
            
            # React Props或いはNext.jsのデータから情報を抽出
            script_elements = soup.find_all('script')
            for script in script_elements:
                try:
                    script_text = script.string if hasattr(script, 'string') and script.string else ''  # type: ignore
                    if script_text and 'world' in str(script_text).lower():  # type: ignore
                        # __NEXT_DATA__やReact propsを探す
                        if '__NEXT_DATA__' in str(script_text):  # type: ignore
                            # Next.jsのデータを解析
                            script_str = str(script_text)  # type: ignore
                            start = script_str.find('{')  # type: ignore
                            end = script_str.rfind('}') + 1  # type: ignore
                            if start != -1 and end != -1:
                                data = json.loads(script_str[start:end])  # type: ignore
                                # プロパティを再帰的に探索
                                self._extract_from_json_data(data, world_info)  # type: ignore
                except (json.JSONDecodeError, AttributeError, TypeError):
                    continue
            
            # Capacityとpublishedの情報を検索
            text_content = soup.get_text()
            
            # Capacityを抽出
            capacity_match = re.search(r'capacity[:\s]*(\d+)', text_content, re.I)
            if capacity_match:
                world_info['capacity'] = capacity_match.group(1)
            
            # Published日付を抽出
            published_patterns = [
                r'published[:\s]*(\d{4}[-/]\d{1,2}[-/]\d{1,2})',
                r'created[:\s]*(\d{4}[-/]\d{1,2}[-/]\d{1,2})',
                r'(\d{4}[-/]\d{1,2}[-/]\d{1,2})'
            ]
            for pattern in published_patterns:
                match = re.search(pattern, text_content, re.I)
                if match:
                    world_info['published'] = match.group(1)
                    break
            
            return world_info
            
        except Exception as e:
            logger.error(f"ワールド情報抽出例外: {e}")
            return None
    
    def _extract_from_json_data(self, data: Any, world_info: Dict[str, Any]) -> None:  # type: ignore
        """
        JSONデータから再帰的にワールド情報を抽出
        """
        if isinstance(data, dict):
            for key, value in data.items():  # type: ignore
                key_lower = str(key).lower()  # type: ignore
                if key_lower == 'name' and not world_info['title']:
                    world_info['title'] = str(value)  # type: ignore
                elif key_lower == 'description' and not world_info['description']:
                    world_info['description'] = str(value)  # type: ignore
                elif key_lower in ['imageurl', 'thumbnailurl', 'image'] and not world_info['thumbnail_url']:
                    world_info['thumbnail_url'] = str(value)  # type: ignore
                elif key_lower in ['author', 'creator'] and not world_info['creator']:
                    if isinstance(value, dict):
                        world_info['creator'] = str(value.get('name', value))  # type: ignore
                    else:
                        world_info['creator'] = str(value)  # type: ignore
                elif key_lower == 'capacity' and not world_info['capacity']:
                    world_info['capacity'] = str(value)  # type: ignore
                elif key_lower in ['published', 'createdat', 'publicatedat'] and not world_info['published']:
                    world_info['published'] = str(value)  # type: ignore
                elif isinstance(value, (dict, list)):
                    self._extract_from_json_data(value, world_info)  # type: ignore
        elif isinstance(data, list):
            for item in data:  # type: ignore
                self._extract_from_json_data(item, world_info)  # type: ignore

    def scrape_world_by_url(self, url: str) -> Optional[Dict[str, Any]]:
        """
        VRChatワールドURLから情報をスクレイピング
        """
        # URLからワールドIDを抽出
        world_id_match = re.search(r'wrld_[a-f0-9-]+', url)
        if not world_id_match:
            logger.error(f"無効なワールドURL: {url}")
            return None
        
        world_id = world_id_match.group(0)
        logger.info(f"ワールドID抽出: {world_id}")
        
        # まずVRChat APIでワールド情報を取得を試行
        api_data = self.get_world_details(world_id)
        if api_data:
            # サムネイル画像をダウンロード
            thumbnail_url = api_data.get('imageUrl', '')
            logger.info(f"サムネイルURL確認: '{thumbnail_url}' (長さ: {len(str(thumbnail_url))})")
            if thumbnail_url:
                logger.info(f"サムネイルダウンロード開始: {world_id}")
                thumbnail_path = self.download_thumbnail(str(thumbnail_url), world_id)
                if thumbnail_path:
                    api_data['thumbnail_path'] = thumbnail_path
                    logger.info(f"サムネイルパス設定: {thumbnail_path}")
                else:
                    logger.warning(f"サムネイルダウンロード失敗: {world_id}")
            else:
                logger.warning(f"サムネイルURLが空またはNone - ワールドID: {world_id}")
            
            # VRChat APIデータを処理してFirebase用の形式に変換
            processed_world = self.process_world_data(api_data)
            logger.info(f"API経由でワールド情報取得成功: {processed_world.get('name', 'Unknown')}")
            return processed_world
        
        # APIでの取得に失敗した場合は、Webページスクレイピングを試行
        return self.scrape_world_page(world_id)

    def scrape_worlds_from_file(self, file_path: str) -> List[Dict[str, Any]]:
        """
        ファイルからワールドURLリストを読み込んでバッチ処理
        """
        try:
            # ファイルからURLを読み込み
            with open(file_path, 'r', encoding='utf-8') as f:
                urls = [line.strip() for line in f if line.strip() and line.strip().startswith('https://vrchat.com/home/world/')]
            
            logger.info(f"ファイルから {len(urls)} 件のVRChatワールドURLを読み込みました")
            
            if not urls:
                logger.warning("有効なVRChatワールドURLが見つかりませんでした")
                return []
            
            return self.scrape_multiple_worlds(urls)
            
        except FileNotFoundError:
            logger.error(f"ファイルが見つかりません: {file_path}")
            return []
        except Exception as e:
            logger.error(f"ファイル読み込みエラー: {e}")
            return []
    
    def scrape_multiple_worlds(self, urls: List[str], delay: float = 2.0) -> List[Dict[str, Any]]:
        """
        複数のワールドURLをバッチ処理でスクレイピング
        """
        results: List[Dict[str, Any]] = []
        total_urls = len(urls)
        
        logger.info(f"バッチ処理開始: {total_urls}件のワールドをスクレイピングします")
        
        # 最初に一度だけ認証を確保
        if not self.ensure_authenticated():
            logger.error("認証に失敗しました。バッチ処理を中止します。")
            return []
        
        logger.info("認証完了。バッチ処理を開始します。")
        
        for i, url in enumerate(urls, 1):
            try:
                logger.info(f"進行状況: {i}/{total_urls} - {url}")
                
                # ワールド情報を取得（認証チェックをスキップしてパフォーマンス向上）
                logger.info(f"_scrape_world_by_url_authenticated呼び出し開始: {url}")
                world_info = self._scrape_world_by_url_authenticated(url)  # type: ignore
                logger.info(f"_scrape_world_by_url_authenticated完了: {world_info is not None}")
                
                if world_info:
                    results.append(world_info)
                    logger.info(f"✅ 成功: {world_info.get('title', 'Unknown')} (作者: {world_info.get('creator', 'Unknown')})")  # type: ignore
                    
                    # Firebaseに保存
                    try:
                        self.firebase_manager.save_vrchat_world_data(world_info)
                        logger.info(f"📊 Firebase保存完了: {world_info['world_id']}")
                    except Exception as e:
                        logger.error(f"Firebase保存エラー: {e}")
                else:
                    logger.warning(f"❌ 失敗: {url}")
                
                # レート制限のための待機（最後のアイテム以外）
                if i < total_urls:
                    logger.info(f"⏱️  {delay}秒待機中...")
                    time.sleep(delay)
                    
            except KeyboardInterrupt:
                logger.info("⚠️  ユーザーによって処理が中断されました")
                break
            except Exception as e:
                logger.error(f"❌ URL処理エラー {url}: {e}")
                continue
        
        logger.info(f"🎉 バッチ処理完了: {len(results)}/{total_urls} 件のワールドデータを取得しました")  # type: ignore
        return results
    
    def _scrape_world_by_url_authenticated(self, url: str) -> Optional[Dict[str, Any]]:
        """
        認証済みセッションでワールド情報を取得（認証チェックをスキップ）
        """
        logger.info(f"_scrape_world_by_url_authenticated開始: {url}")
        # URLからワールドIDを抽出
        world_id_match = re.search(r'wrld_[a-f0-9-]+', url)
        if not world_id_match:
            logger.error(f"無効なワールドURL: {url}")
            return None
        
        world_id = world_id_match.group(0)
        logger.info(f"ワールドID抽出: {world_id}")
        
        # APIからワールド情報を取得（認証チェックをスキップ）
        api_data = self._get_world_details_authenticated(world_id)
        if api_data:
            # サムネイル画像をダウンロード
            thumbnail_url = str(api_data.get('imageUrl', ''))  # type: ignore
            logger.info(f"サムネイルURL確認: '{thumbnail_url}' (長さ: {len(thumbnail_url)})")
            if thumbnail_url:
                logger.info(f"サムネイルダウンロード開始: {world_id}")
                thumbnail_path = self.download_thumbnail(thumbnail_url, world_id)
                if thumbnail_path:
                    api_data['thumbnail_path'] = thumbnail_path
                    logger.info(f"サムネイルパス設定: {thumbnail_path}")
                else:
                    logger.warning(f"サムネイルダウンロード失敗: {world_id}")
            else:
                logger.warning(f"サムネイルURLが空またはNone - ワールドID: {world_id}")
            
            # VRChat APIデータを処理してFirebase用の形式に変換
            processed_world = self.process_world_data(api_data)
            
            logger.info(f"API経由でワールド情報取得成功: {processed_world.get('name', 'Unknown')}")
            return processed_world
        
        logger.warning(f"API経由でのワールド情報取得に失敗: {world_id}")
        return None
    
    def _get_world_details_authenticated(self, world_id: str) -> Optional[Dict[str, Any]]:
        """
        認証済みセッションでワールド詳細を取得（認証チェックをスキップ）
        """
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
                logger.error(f"ワールド詳細取得失敗: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"ワールド詳細取得エラー: {e}")
            return None

def main():
    """テスト実行用のメイン関数"""
    scraper = VRChatWorldScraper()
    
    try:
        # 指定されたワールドをスクレイピング
        test_url = "https://vrchat.com/home/world/wrld_1cc734ca-afb8-490f-8aec-2aab3779bcf5"
        world_info = scraper.scrape_world_by_url(test_url)
        
        if world_info:
            print("\n=== VRChatワールド情報 ===")
            print(f"タイトル: {world_info['title']}")
            print(f"制作者: {world_info['creator']}")
            print(f"サムネイル: {world_info['thumbnail_url']}")
            print(f"説明: {world_info['description']}")
            print(f"定員: {world_info['capacity']}")
            print(f"公開日: {world_info['published']}")
            
            # Firebaseに保存
            scraper.firebase_manager.save_vrchat_world_data(world_info)
        else:
            print("ワールド情報の取得に失敗しました")
            
    except KeyboardInterrupt:
        print("\n処理が中断されました")
    except Exception as e:
        print(f"エラー: {e}")
    finally:
        scraper.cleanup()

def old_main():
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
