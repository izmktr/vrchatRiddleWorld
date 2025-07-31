#!/usr/bin/env python3
"""
MongoDB Atlasアップローダー
raw_dataフォルダの生データをMongoDB Atlasにアップロード
"""

import os
import sys

# ライブラリパスを追加
sys.path.append(os.path.join(os.path.dirname(__file__), 'python', 'lib'))

from utils import setup_logging, load_raw_data_files, load_raw_data_file
from mongodb_manager import MongoDBManager

def main():
    """メイン処理"""
    setup_logging()
    
    print("🚀 MongoDB Atlasアップローダー開始")
    print("=" * 60)
    
    # 設定
    raw_data_dir = "raw_data"
    
    if not os.path.exists(raw_data_dir):
        print(f"❌ 生データディレクトリが見つかりません: {raw_data_dir}")
        return
    
    # MongoDB接続
    mongodb_manager = MongoDBManager()
    
    if not mongodb_manager.is_connected():
        print("❌ MongoDB Atlasに接続できません")
        print("💡 .envファイルのMONGODB_URI設定を確認してください")
        return
    
    print("✅ MongoDB Atlas接続成功")
    
    # 統計情報表示
    stats = mongodb_manager.get_stats()
    print(f"📊 データベース内ワールド数: {stats.get('total', 0)} 件")
    
    # 生データファイル一覧取得
    raw_files = load_raw_data_files(raw_data_dir)
    
    if not raw_files:
        print("❌ アップロード可能な生データファイルがありません")
        return
    
    print(f"📋 処理対象: {len(raw_files)} 件のファイル")
    print()
    
    try:
        successful_count = 0
        failed_count = 0
        skipped_count = 0
        
        for i, filename in enumerate(raw_files, 1):
            print(f"📍 進行状況: {i}/{len(raw_files)} ({i/len(raw_files)*100:.1f}%)")
            print(f"📄 処理中: {filename}")
            
            try:
                # 生データファイル読み込み
                filepath = os.path.join(raw_data_dir, filename)
                data = load_raw_data_file(filepath)
                
                if not data:
                    print(f"❌ ファイル読み込み失敗: {filename}")
                    failed_count += 1
                    continue
                
                # ワールドデータ抽出
                world_data = data.get('raw_data')
                if not world_data:
                    print(f"❌ ワールドデータが見つかりません: {filename}")
                    failed_count += 1
                    continue
                
                world_id = world_data.get('id')
                world_name = world_data.get('name', 'Unknown')
                
                if not world_id:
                    print(f"❌ ワールドIDが見つかりません: {filename}")
                    failed_count += 1
                    continue
                
                # MongoDB保存
                if mongodb_manager.save_world_data(world_data):
                    print(f"✅ アップロード成功: {world_name} ({world_id})")
                    successful_count += 1
                else:
                    print(f"❌ アップロード失敗: {world_name} ({world_id})")
                    failed_count += 1
                
            except KeyboardInterrupt:
                print("\n⚠️ ユーザーによって処理が中断されました")
                break
            except Exception as e:
                print(f"❌ 処理エラー: {e}")
                failed_count += 1
                continue
            
            print()
        
        # 結果サマリー
        print("=" * 60)
        print("🎉 MongoDB Atlasアップロード完了!")
        print("=" * 60)
        print(f"✅ 成功: {successful_count} 件")
        print(f"❌ 失敗: {failed_count} 件")
        if skipped_count > 0:
            print(f"⏭️ スキップ: {skipped_count} 件")
        
        if successful_count + failed_count > 0:
            success_rate = successful_count / (successful_count + failed_count) * 100
            print(f"📊 成功率: {success_rate:.1f}%")
        
        # 最終統計
        final_stats = mongodb_manager.get_stats()
        print(f"\n📈 最終データベース統計:")
        print(f"・総ワールド数: {final_stats.get('total', 0)} 件")
        print("=" * 60)
        
    except Exception as e:
        print(f"❌ 予期しないエラー: {e}")
    finally:
        mongodb_manager.close()

if __name__ == "__main__":
    main()
