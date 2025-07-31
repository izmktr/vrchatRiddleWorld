#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Firebaseアップローダー

raw_dataフォルダにある生データをFirebaseにアップロードします。
"""

import os
import sys

# ライブラリパスを追加
sys.path.append(os.path.join(os.path.dirname(__file__), 'lib'))

from firebase_manager import FirebaseManager
from utils import load_raw_data_files


def main():
    """メイン処理"""
    print("🔥 Firebaseアップローダー")
    print("=" * 50)
    
    # Firebase接続
    firebase = FirebaseManager()
    if not firebase.is_connected():
        print("❌ Firebase接続が無効です")
        print("💡 Firebase設定ファイルとプロジェクトIDを確認してください")
        return
    
    print("✅ Firebase接続成功")
    
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
            # Firebaseに保存
            result = firebase.save_world_data(raw_data)
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
        stats = firebase.get_stats()
        print("\n📈 データベース統計情報")
        print(f"📄 総ドキュメント数: {stats.get('total_documents', 'N/A')}件")
        print(f"🔥 Firestoreコレクション: {stats.get('collection_name', 'N/A')}")
    except Exception as e:
        print(f"⚠️  統計情報取得エラー: {str(e)}")
    
    print("=" * 50)


if __name__ == "__main__":
    main()
