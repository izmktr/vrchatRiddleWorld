#!/usr/bin/env python3
"""
VRChatワールドダウンローダー
vrcworld.txtからワールドデータをダウンロードして保存
"""

import os
import sys
import time
from typing import List

# ライブラリパスを追加
sys.path.append(os.path.join(os.path.dirname(__file__), 'python', 'lib'))

from utils import setup_logging, load_world_urls, save_raw_data, ensure_directory
from vrchat_scraper import VRChatWorldScraper

def main():
    """メイン処理"""
    setup_logging()
    
    print("🚀 VRChatワールドダウンローダー開始")
    print("=" * 60)
    
    # 設定
    world_urls_file = "vrcworld.txt"
    thumbnail_dir = "thumbnail"
    raw_data_dir = "raw_data"
    delay_seconds = 2.0
    
    # ディレクトリ作成
    ensure_directory(thumbnail_dir)
    ensure_directory(raw_data_dir)
    
    # URLリスト読み込み
    urls = load_world_urls(world_urls_file)
    if not urls:
        print("❌ 処理可能なURLがありません")
        return
    
    print(f"📋 処理対象: {len(urls)} 件のワールド")
    print(f"📁 サムネイル保存先: {thumbnail_dir}")
    print(f"📁 生データ保存先: {raw_data_dir}")
    print(f"⏱️ 処理間隔: {delay_seconds} 秒")
    print()
    
    # スクレイパー初期化
    scraper = VRChatWorldScraper()
    
    try:
        successful_count = 0
        failed_count = 0
        
        for i, url in enumerate(urls, 1):
            print(f"📍 進行状況: {i}/{len(urls)} ({i/len(urls)*100:.1f}%)")
            print(f"🔗 処理中: {url}")
            
            try:
                # ワールドデータ取得
                world_data = scraper.scrape_world_by_url(url)
                
                if world_data:
                    world_id = world_data.get('id', 'unknown')
                    world_name = world_data.get('name', 'Unknown')
                    
                    print(f"✅ 取得成功: {world_name} ({world_id})")
                    
                    # 生データ保存（上書き）
                    raw_file = save_raw_data(world_data, raw_data_dir)
                    if raw_file:
                        print(f"💾 生データ保存: {os.path.basename(raw_file)}")
                    
                    # サムネイル保存（スキップあり）
                    thumbnail_file = scraper.download_thumbnail(world_data, thumbnail_dir)
                    if thumbnail_file:
                        if os.path.basename(thumbnail_file) in [f for f in os.listdir(thumbnail_dir) if f.endswith('.jpg')]:
                            action = "スキップ" if "スキップ" in str(thumbnail_file) else "保存"
                            print(f"📷 サムネイル{action}: {os.path.basename(thumbnail_file)}")
                    
                    successful_count += 1
                else:
                    print(f"❌ 取得失敗: {url}")
                    failed_count += 1
                
                # 進行状況表示
                if i < len(urls):
                    print(f"💤 {delay_seconds}秒待機中...")
                    print()
                    time.sleep(delay_seconds)
                
            except KeyboardInterrupt:
                print("\n⚠️ ユーザーによって処理が中断されました")
                break
            except Exception as e:
                print(f"❌ 処理エラー: {e}")
                failed_count += 1
                continue
        
        # 結果サマリー
        print("=" * 60)
        print("🎉 ダウンロード処理完了!")
        print("=" * 60)
        print(f"✅ 成功: {successful_count} 件")
        print(f"❌ 失敗: {failed_count} 件")
        if successful_count + failed_count > 0:
            success_rate = successful_count / (successful_count + failed_count) * 100
            print(f"📊 成功率: {success_rate:.1f}%")
        
        # ファイル統計
        thumbnail_files = [f for f in os.listdir(thumbnail_dir) if f.endswith('.jpg')]
        raw_files = [f for f in os.listdir(raw_data_dir) if f.startswith('vrchat_raw_')]
        
        print(f"\n📈 保存ファイル統計:")
        print(f"・サムネイル: {len(thumbnail_files)} 件")
        print(f"・生データ: {len(raw_files)} 件")
        print("=" * 60)
        
    except Exception as e:
        print(f"❌ 予期しないエラー: {e}")
    finally:
        scraper.cleanup()

if __name__ == "__main__":
    main()
