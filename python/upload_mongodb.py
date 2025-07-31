#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MongoDB Atlasアップローダー

raw_dataフォルダにある生データをMongoDB Atlasにアップロードします。
"""

import os
import sys

# ライブラリパスを追加
sys.path.append(os.path.join(os.path.dirname(__file__), 'lib'))

from mongodb_manager import MongoDBManager
from utils import load_raw_data_files


def main():
    """メイン処理"""
    print("🗄️  MongoDB Atlasアップローダー")
    print("=" * 50)
    
    # MongoDB接続
    mongodb = MongoDBManager()
    if not mongodb.is_connected():
        print("❌ MongoDB接続が無効です")
        print("💡 環境変数MONGODB_URIを確認してください")
        return
    
    print("✅ MongoDB Atlas接続成功")
    
    # 生データファイルを読み込み
    raw_data_files = load_raw_data_files()
    if not raw_data_files:
        print("❌ raw_dataフォルダにJSONファイルが見つかりません")
        return
    
    print(f"📋 {len(raw_data_files)}件の生データファイルを発見")
    print("-" * 50)
    
    success_count = 0
    error_count = 0
    
    for i, (world_id, raw_data) in enumerate(raw_data_files.items(), 1):
        print(f"\n🔄 [{i}/{len(raw_data_files)}] アップロード中: {world_id}")
        
        try:
            # MongoDBに保存
            result = mongodb.save_world_data(raw_data)
            if result:
                print(f"✅ {world_id}: アップロード完了")
                success_count += 1
            else:
                print(f"❌ {world_id}: アップロード失敗")
                error_count += 1
                
        except Exception as e:
            print(f"❌ {world_id}: エラー - {str(e)}")
            error_count += 1
            continue
    
    # 結果サマリー
    print("\n" + "=" * 50)
    print("📊 アップロード結果サマリー")
    print(f"✅ 成功: {success_count}件")
    print(f"❌ エラー: {error_count}件")
    print(f"📋 合計: {len(raw_data_files)}件")
    
    # データベース統計情報
    try:
        stats = mongodb.get_stats()
        print("\n📈 データベース統計情報")
        print(f"📄 総ドキュメント数: {stats.get('total_documents', 'N/A')}件")
        print(f"💾 データベースサイズ: {stats.get('db_size_mb', 'N/A')}MB")
    except Exception as e:
        print(f"⚠️  統計情報取得エラー: {str(e)}")
    
    print("=" * 50)


if __name__ == "__main__":
    main()
