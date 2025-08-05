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
            
            # 既存のraw_dataをチェック
            existing_data = self._check_existing_raw_data(world_id)
            if existing_data:
                print(f"⏭️  既存データを使用: {world_id}（1日以内のデータあり）")
                # キャッシュから取得したことを示すフラグを追加
                existing_data['_from_cache'] = True
                return existing_data
            
            # VRChat APIエンドポイント
            api_url = f"https://api.vrchat.cloud/api/1/worlds/{world_id}"
            
            response = self.session.get(api_url, timeout=30)
            response.raise_for_status()
            
            world_data = response.json()
            
            # 追加情報を付与
            world_data['scraped_at'] = datetime.now().isoformat()
            world_data['source_url'] = url
            world_data['_from_cache'] = False  # 新規取得データ
            
            return world_data
            
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ API取得エラー {url}: {e}")
            return None
        except json.JSONDecodeError as e:
            logger.error(f"❌ JSON解析エラー {url}: {e}")
            return None
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
    
    def _check_existing_raw_data(self, world_id: str) -> Optional[Dict[str, Any]]:
        """既存のraw_dataをチェックし、1日以内のデータがあれば返す"""
        try:
            # raw_dataファイルパス
            raw_data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), '..', 'raw_data')
            raw_data_file = os.path.join(raw_data_dir, f"vrchat_raw_{world_id}.json")
            
            # ファイルが存在しない場合
            if not os.path.exists(raw_data_file):
                return None
            
            # ファイルを読み込み
            with open(raw_data_file, 'r', encoding='utf-8') as f:
                raw_data = json.load(f)
            
            # scraped_atを確認
            scraped_at_str = raw_data.get('raw_data', {}).get('scraped_at')
            if not scraped_at_str:
                return None
            
            # updateされた日付をISOフォーマットで取得
            updated_at_str = raw_data.get('raw_data', {}).get('updated_at')
            if not updated_at_str:
                return None

            # 日付を比較（1日以内かチェック）
            scraped_at = datetime.fromisoformat(scraped_at_str.replace('Z', '+00:00'))
            now = datetime.now().replace(tzinfo=scraped_at.tzinfo)  # 同じタイムゾーンに合わせる
            time_diff = now - scraped_at

            updated_at = datetime.fromisoformat(updated_at_str.replace('Z', '+00:00'))
            update_diff = scraped_at - updated_at
            
            # 1日（24時間）以内なら既存データを返す
            if time_diff.total_seconds() < 86400:  # 86400秒 = 24時間
                return raw_data.get('raw_data', {})
            
            # ワールドの更新からの日付に応じて、更新間隔を開ける
            if time_diff.total_seconds() < update_diff.total_seconds() / 7:
                return raw_data.get('raw_data', {})
            
            return None
            
        except Exception as e:
            logger.error(f"❌ 既存データチェックエラー {world_id}: {e}")
            return None
    
    def cleanup(self):
        """リソースのクリーンアップ"""
        if hasattr(self, 'session'):
            self.session.close()
