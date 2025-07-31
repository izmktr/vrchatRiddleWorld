#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
VRChatワールドデータダウンローダー

vrcworld.txtにあるワールドURLからデータをダウンロードし、
サムネイル画像とAPIデータを保存します。
"""

import os
import sys
import time
from datetime import datetime

# ライブラリパスを追加
sys.path.append(os.path.join(os.path.dirname(__file__), 'lib'))

from vrchat_scraper import VRChatScraper
from utils import load_world_urls, save_raw_data


def main():
    """メイン処理"""
    print("🌍 VRChatワールドデータダウンローダー")
    print("=" * 50)
    
    # スクレイパー初期化
    scraper = VRChatScraper()
    
    # ワールドURLリストを読み込み
    world_urls = load_world_urls()
    if not world_urls:
        print("❌ vrcworld.txtにワールドURLが見つかりません")
        return
    
    print(f"📋 {len(world_urls)}件のワールドURLを読み込みました")
    print("-" * 50)
    
    success_count = 0
    skip_count = 0
    error_count = 0
    
    for i, url in enumerate(world_urls, 1):
        print(f"\n🔄 [{i}/{len(world_urls)}] 処理中: {url}")
        
        try:
            # ワールドデータを取得
            world_data = scraper.scrape_world_by_url(url)
            if not world_data:
                print(f"❌ ワールドデータの取得に失敗: {url}")
                error_count += 1
                continue
            
            world_id = world_data.get('id')
            if not world_id:
                print(f"❌ ワールドIDが見つかりません: {url}")
                error_count += 1
                continue
            
            # サムネイルダウンロード（既存ファイルはスキップ）
            thumbnail_url = world_data.get('thumbnailImageUrl')
            if thumbnail_url:
                thumbnail_result = scraper.download_thumbnail(world_id, thumbnail_url)
                if thumbnail_result == "skipped":
                    print(f"⏭️  サムネイル: {world_id}.jpg（既存ファイル）")
                elif thumbnail_result:
                    print(f"✅ サムネイル: {world_id}.jpg（ダウンロード完了）")
                else:
                    print(f"⚠️  サムネイル: ダウンロード失敗")
            
            # 生データを保存（上書き）
            raw_data_entry = {
                "timestamp": datetime.now().isoformat(),
                "world_id": world_id,
                "source": "vrchat_api",
                "raw_data": {
                    **world_data,
                    "scraped_at": datetime.now().isoformat()
                }
            }
            
            if save_raw_data(world_id, raw_data_entry):
                print(f"✅ 生データ: {world_id}（保存完了）")
                success_count += 1
            else:
                print(f"❌ 生データ: 保存失敗")
                error_count += 1
            
            # レート制限（2秒間隔）
            if i < len(world_urls):
                print("⏳ 2秒待機中...")
                time.sleep(2)
                
        except Exception as e:
            print(f"❌ エラー: {str(e)}")
            error_count += 1
            continue
    
    # 結果サマリー
    print("\n" + "=" * 50)
    print("📊 処理結果サマリー")
    print(f"✅ 成功: {success_count}件")
    print(f"⏭️  スキップ: {skip_count}件")
    print(f"❌ エラー: {error_count}件")
    print(f"📋 合計: {len(world_urls)}件")
    print("=" * 50)


if __name__ == "__main__":
    main()
