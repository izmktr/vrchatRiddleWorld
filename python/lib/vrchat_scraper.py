"""
VRChat ワールドスクレイピングライブラリ
"""

import os
import json
import logging
import requests
from datetime import datetime
from typing import Dict, Any, Optional, Tuple

logger = logging.getLogger(__name__)

class VRChatWorldScraper:
    """VRChatワールドスクレイピングクラス"""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
        })
        
    def scrape_world_by_url(self, url: str) -> Optional[Dict[str, Any]]:
        """URLからワールド情報をスクレイピング"""
        try:
            # ワールドIDを抽出
            world_id = self._extract_world_id(url)
            if not world_id:
                logger.error(f"❌ ワールドIDの抽出に失敗: {url}")
                return None
            
            # VRChat APIエンドポイント
            api_url = f"https://api.vrchat.cloud/api/1/worlds/{world_id}"
            
            response = self.session.get(api_url, timeout=30)
            response.raise_for_status()
            
            world_data = response.json()
            
            # 追加情報を付与
            world_data['scraped_at'] = datetime.now().isoformat()
            world_data['source_url'] = url
            
            return world_data
            
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ API取得エラー {url}: {e}")
            return None
        except json.JSONDecodeError as e:
            logger.error(f"❌ JSON解析エラー {url}: {e}")
            return None
        except Exception as e:
            logger.error(f"❌ 予期しないエラー {url}: {e}")
            return None
    
    def _extract_world_id(self, url: str) -> Optional[str]:
        """URLからワールドIDを抽出"""
        try:
            if '/world/' in url:
                world_id = url.split('/world/')[-1].split('/')[0].split('?')[0]
                if world_id.startswith('wrld_'):
                    return world_id
            return None
        except Exception:
            return None
    
    def download_thumbnail(self, world_data: Dict[str, Any], output_dir: str) -> Optional[Tuple[str, str]]:
        """サムネイル画像をダウンロード。('downloaded', path)または('skipped', path)を返す"""
        try:
            world_id = world_data.get('id')
            thumbnail_url = world_data.get('thumbnailImageUrl') or world_data.get('imageUrl')

            if not world_id or not thumbnail_url:
                return None

            # ファイルパス設定
            filename = f"{world_id}.jpg"
            filepath = os.path.join(output_dir, filename)

            # 既存ファイルがある場合はスキップ
            if os.path.exists(filepath):
                logger.info(f"📷 サムネイルスキップ（既存）: {filename}")
                return ('skipped', filepath)

            # ダウンロード実行
            response = self.session.get(thumbnail_url, timeout=30)
            response.raise_for_status()

            with open(filepath, 'wb') as f:
                f.write(response.content)

            logger.info(f"📷 サムネイル保存: {filename}")
            return ('downloaded', filepath)

        except Exception as e:
            logger.error(f"❌ サムネイルダウンロードエラー: {e}")
            return ('error', '')
    
    def cleanup(self):
        """リソースのクリーンアップ"""
        if hasattr(self, 'session'):
            self.session.close()
