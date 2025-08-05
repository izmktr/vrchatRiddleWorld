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
from typing import List


# ライブラリパスを絶対パスで追加
lib_path = os.path.abspath(os.path.join(os.path.dirname(__file__), 'lib'))
if lib_path not in sys.path:
    sys.path.insert(0, lib_path)

from lib.vrchat_scraper import VRChatWorldScraper
from lib.utils import load_world_urls, save_raw_data


def main():
    """メイン処理"""
    print("🌍 VRChatワールドデータダウンローダー")
    print("=" * 50)
    
    # スクレイパー初期化
    scraper = VRChatWorldScraper()
    
    # ワールドURLリストを読み込み（ルートディレクトリのvrcworld.txtを参照）
    vrcworld_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'vrcworld.txt')
    world_urls = load_world_urls(vrcworld_path)
    if not world_urls:
        print("❌ vrcworld.txtにワールドURLが見つかりません")
        return
    
    print(f"📋 {len(world_urls)}件のワールドURLを読み込みました")
    print("-" * 50)
    
    success_count = 0
    skip_count = 0
    error_count = 0
    error_worlds: List[str] = []  # エラーワールドのリスト
    
    for i, url in enumerate(world_urls, 1):
        print(f"\n🔄 [{i}/{len(world_urls)}] 処理中: {url}")
        
        try:
            # ワールドデータを取得
            world_data = scraper.scrape_world_by_url(url)
            if not world_data:
                print(f"❌ ワールドデータの取得に失敗: {url}")
                error_count += 1
                error_worlds.append(f"{url} - データ取得失敗")
                continue
            
            world_id = world_data.get('id')
            if not world_id:
                print(f"❌ ワールドIDが見つかりません: {url}")
                error_count += 1
                error_worlds.append(f"{url} - ワールドID不明")
                continue
            
            # 既存データを使用したかどうかを判定
            is_from_cache = world_data.get('_from_cache', False)
            
            # サムネイルダウンロード（既存ファイルはスキップ）
            thumbnail_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'thumbnail')
            thumbnail_result = scraper.download_thumbnail(world_data, thumbnail_dir)
            if thumbnail_result:
                status, _ = thumbnail_result
                if status == 'downloaded':
                    print(f"✅ サムネイル: {world_id}.jpg（ダウンロード完了）")
                elif status == 'skipped':
                    print(f"⏭️  サムネイル: {world_id}.jpg（既存ファイル）")
                else:
                    print(f"⚠️  サムネイル: ダウンロード失敗")
            else:
                print(f"⚠️  サムネイル: ダウンロード失敗")
            
            # 生データを保存（save_raw_dataの仕様に合わせてworld_dataを直接渡す）
            raw_data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'raw_data')
            if save_raw_data(world_data, raw_data_dir):
                if is_from_cache:
                    print(f"✅ 生データ: {world_id}（既存データ使用）")
                    skip_count += 1
                else:
                    print(f"✅ 生データ: {world_id}（保存完了）")
                    success_count += 1
            else:
                print(f"❌ 生データ: 保存失敗")
                error_count += 1
                error_worlds.append(f"{url} - 生データ保存失敗 (ID: {world_id})")
            
            # レート制限（2秒間隔）- 既存データ使用時はスキップ
            if i < len(world_urls) and not is_from_cache:
                print("⏳ 2秒待機中...")
                time.sleep(2)
                
        except Exception as e:
            print(f"❌ エラー: {str(e)}")
            error_count += 1
            error_worlds.append(f"{url} - 例外エラー: {str(e)}")
            continue
    
    # 結果サマリー
    print("\n" + "=" * 50)
    print("📊 処理結果サマリー")
    print(f"✅ 成功: {success_count}件")
    print(f"⏭️  スキップ: {skip_count}件")
    print(f"❌ エラー: {error_count}件")
    print(f"📋 合計: {len(world_urls)}件")
    print("=" * 50)
    
    # エラーワールドのログ出力
    if error_worlds:
        error_log_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'error_world.txt')
        try:
            with open(error_log_path, 'w', encoding='utf-8') as f:
                f.write(f"# エラーワールドログ - {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
                f.write(f"# 総エラー数: {error_count}件\n\n")
                for error_entry in error_worlds:
                    f.write(f"{error_entry}\n")
            print(f"📝 エラーログを出力しました: error_world.txt ({error_count}件)")
        except Exception as e:
            print(f"⚠️  エラーログの出力に失敗: {str(e)}")
    else:
        print("🎉 エラーなく全て処理が完了しました！")


if __name__ == "__main__":
    main()
