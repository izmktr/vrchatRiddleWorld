"""
共通ユーティリティライブラリ
"""

import os
import json
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

def setup_logging(level=logging.INFO):
    """ログ設定"""
    logging.basicConfig(
        level=level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler()
        ]
    )

def load_world_urls(file_path: str) -> List[str]:
    """ワールドURLリストを読み込み"""
    try:
        with open(file_path, 'r', encoding='utf-8-sig') as f:
            urls = [
                line.strip() 
                for line in f 
                if line.strip() and line.strip().startswith('https://vrchat.com/home/world/')
            ]
        logger.info(f"📁 {len(urls)} 件のURLを読み込み: {file_path}")
        return urls
    except FileNotFoundError:
        logger.error(f"❌ ファイルが見つかりません: {file_path}")
        return []
    except Exception as e:
        logger.error(f"❌ ファイル読み込みエラー: {e}")
        return []

def save_raw_data(world_data: Dict[str, Any], output_dir: str) -> Optional[str]:
    """生データをJSONファイルに保存"""
    try:
        # world_idはworld_data.get('id')またはworld_data.get('world_id')で取得
        world_id = world_data.get('id') or world_data.get('world_id')
        if not world_id:
            return None

        # ディレクトリ作成
        os.makedirs(output_dir, exist_ok=True)

        # ファイル名生成（world_idのみで一意に）
        filename = f"vrchat_raw_{world_id}.json"
        filepath = os.path.join(output_dir, filename)

        # データ整形
        formatted_data = {
            'timestamp': datetime.now().isoformat(),
            'world_id': world_id,
            'source': 'vrchat_api',
            'raw_data': world_data
        }

        # ファイル保存（上書き）
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(formatted_data, f, ensure_ascii=False, indent=2)

        logger.info(f"💾 生データ保存: {filename}")
        return filepath

    except Exception as e:
        logger.error(f"❌ 生データ保存エラー: {e}")
        return None

def load_raw_data_files(raw_data_dir: str) -> List[str]:
    """生データファイル一覧を取得"""
    try:
        if not os.path.exists(raw_data_dir):
            logger.warning(f"⚠️ 生データディレクトリが見つかりません: {raw_data_dir}")
            return []
        
        files = [
            f for f in os.listdir(raw_data_dir) 
            if f.startswith('vrchat_raw_') and f.endswith('.json')
        ]
        files.sort(reverse=True)  # 新しい順
        return files
    except Exception as e:
        logger.error(f"❌ ファイル一覧取得エラー: {e}")
        return []

def load_raw_data_file(file_path: str) -> Optional[Dict[str, Any]]:
    """生データファイルを読み込み"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return data
    except Exception as e:
        logger.error(f"❌ ファイル読み込みエラー {file_path}: {e}")
        return None

def ensure_directory(directory: str):
    """ディレクトリが存在しない場合は作成"""
    os.makedirs(directory, exist_ok=True)
