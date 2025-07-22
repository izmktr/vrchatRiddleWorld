"""
TypeScript開発用のシンプルテストサーバー
Firebase連携版
"""

from flask import Flask, jsonify, send_from_directory, request
from flask_cors import CORS
import os
import json
from datetime import datetime, timedelta
import random

# Firebase設定をインポート
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'python'))
from firebase_config import FirebaseManager

app = Flask(__name__)
CORS(app)

# プロジェクトルートディレクトリ
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Firebase Manager インスタンス
firebase_manager = FirebaseManager()

# テスト用サンプルデータ
def generate_sample_worlds(count=50):
    """サンプルワールドデータを生成"""
    worlds = []
    authors = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry']
    statuses = ['public', 'private']
    
    for i in range(count):
        world = {
            'id': f'wrld_{i:08d}',
            'name': f'Sample World {i+1}',
            'description': f'これはサンプルワールド{i+1}の説明です。テスト用のデータとして作成されました。',
            'author': f'user_{i%len(authors)}',
            'authorDisplayName': authors[i % len(authors)],
            'releaseStatus': random.choice(statuses),
            'visits': random.randint(10, 10000),
            'created_at': (datetime.now() - timedelta(days=random.randint(1, 365))).isoformat(),
            'updated_at': (datetime.now() - timedelta(days=random.randint(1, 30))).isoformat(),
            'thumbnailImageUrl': f'https://picsum.photos/320/200?random={i}',
            'imageUrl': f'https://picsum.photos/640/400?random={i}',
            'tags': ['test', 'sample', 'demo'][:(i%3)+1],
            'unity_version': '2022.3.6f1',
            'platform': 'PC'
        }
        worlds.append(world)
    
    return worlds

sample_worlds = generate_sample_worlds()

# 静的ファイルの配信
@app.route('/')
def index():
    return send_from_directory(os.path.join(project_root, 'web'), 'index.html')

@app.route('/manage-worlds.html')
def manage():
    return send_from_directory(os.path.join(project_root, 'web'), 'manage-worlds.html')

@app.route('/src/<path:filename>')
def serve_src(filename):
    return send_from_directory(os.path.join(project_root, 'web', 'src'), filename)

# API エンドポイント
@app.route('/api/health')
def health():
    """ヘルスチェック"""
    firebase_connected = firebase_manager.is_initialized()
    
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'database_connected': firebase_connected,
        'message': 'Development server with Firebase integration'
    })

@app.route('/api/stats')
def stats():
    """統計情報"""
    if firebase_manager.is_initialized():
        # Firebaseからワールドデータを取得
        try:
            worlds = firebase_manager.get_vrchat_worlds(limit=1000)  # 統計用なので多めに取得
            
            if not worlds:
                # Firebaseにデータがない場合はサンプルデータを使用
                worlds = sample_worlds
                
            public_worlds = len([w for w in worlds if w.get('releaseStatus') == 'public'])
            avg_visits = sum(w.get('visits', 0) for w in worlds) / len(worlds) if worlds else 0
            
            return jsonify({
                'total_worlds': len(worlds),
                'public_worlds': public_worlds,
                'private_worlds': len(worlds) - public_worlds,
                'avg_visits': int(avg_visits),
                'last_updated': max((w.get('updated_at') for w in worlds if w.get('updated_at')), default=datetime.now().isoformat()),
                'data_source': 'firebase'
            })
        except Exception as e:
            print(f"Firebase統計取得エラー: {e}")
            # エラーの場合はサンプルデータを使用
    
    # サンプルデータでの統計（Firebaseが利用できない場合）
    public_worlds = len([w for w in sample_worlds if w['releaseStatus'] == 'public'])
    avg_visits = sum(w['visits'] for w in sample_worlds) / len(sample_worlds)
    
    return jsonify({
        'total_worlds': len(sample_worlds),
        'public_worlds': public_worlds,
        'private_worlds': len(sample_worlds) - public_worlds,
        'avg_visits': int(avg_visits),
        'last_updated': max(w['updated_at'] for w in sample_worlds),
        'data_source': 'sample'
    })

@app.route('/api/vrchat_worlds')
def get_worlds():
    """ワールド一覧取得（Firebase優先、フォールバックでサンプルデータ）"""
    # クエリパラメータの取得
    limit = int(request.args.get('limit', 20))
    search = request.args.get('search', '').lower()
    release_status = request.args.get('releaseStatus', 'all')
    sort_by = request.args.get('sortBy', 'updated_at_desc')
    
    # Firebaseからデータを取得を試みる
    if firebase_manager.is_initialized():
        try:
            print(f"🔥 Firebaseからワールドデータを取得中... (limit: {limit})")
            firebase_worlds = firebase_manager.get_vrchat_worlds(limit=limit * 2)  # フィルタリング前なので多めに取得
            
            if firebase_worlds:
                print(f"✅ Firebaseから {len(firebase_worlds)} 件のワールドデータを取得しました")
                filtered_worlds = firebase_worlds.copy()
                data_source = 'firebase'
            else:
                print("⚠️ Firebaseにデータが見つかりません。サンプルデータを使用します")
                filtered_worlds = sample_worlds.copy()
                data_source = 'sample_fallback'
        except Exception as e:
            print(f"❌ Firebase取得エラー: {e}")
            print("🔄 サンプルデータにフォールバックします")
            filtered_worlds = sample_worlds.copy()
            data_source = 'sample_error'
    else:
        print("⚠️ Firebaseが初期化されていません。サンプルデータを使用します")
        filtered_worlds = sample_worlds.copy()
        data_source = 'sample_no_firebase'
    
    # フィルタリング
    if search:
        print(f"🔍 検索実行: '{search}'")
        original_count = len(filtered_worlds)
        
        filtered_worlds = [w for w in filtered_worlds if 
                          search in w.get('name', '').lower() or 
                          search in w.get('title', '').lower() or  # Firebase用
                          search in w.get('author', '').lower() or
                          search in w.get('authorName', '').lower() or  # Firebase用
                          search in w.get('authorDisplayName', '').lower() or
                          search in w.get('description', '').lower()]
        
        print(f"📊 検索結果: {len(filtered_worlds)} 件 (検索前: {original_count} 件)")
    
    if release_status != 'all':
        print(f"🔍 ステータスフィルター: '{release_status}'")
        original_count = len(filtered_worlds)
        filtered_worlds = [w for w in filtered_worlds if w.get('releaseStatus') == release_status]
        print(f"📊 ステータスフィルター結果: {len(filtered_worlds)} 件 (フィルター前: {original_count} 件)")
    
    # ソート
    reverse_order = sort_by.endswith('_desc')
    sort_key = sort_by.replace('_desc', '').replace('_asc', '')
    
    if sort_key == 'name':
        filtered_worlds.sort(key=lambda w: w.get('name', ''), reverse=reverse_order)
    elif sort_key == 'visits':
        filtered_worlds.sort(key=lambda w: w.get('visits', 0), reverse=reverse_order)
    elif sort_key == 'updated_at':
        filtered_worlds.sort(key=lambda w: w.get('updated_at', ''), reverse=reverse_order)
    
    # 制限適用
    limited_worlds = filtered_worlds[:limit]
    
    print(f"📊 最終結果: {len(limited_worlds)} 件を返します (フィルタ後全体: {len(filtered_worlds)} 件, データソース: {data_source})")
    
    return jsonify({
        'success': True,
        'data': limited_worlds,
        'count': len(limited_worlds),
        'total': len(filtered_worlds),
        'data_source': data_source
    })

@app.route('/api/vrchat_worlds/all')
def get_all_worlds():
    """全ワールドデータ取得（Firebase優先、フォールバックでサンプルデータ）"""
    
    # Firebaseからデータを取得を試みる
    if firebase_manager.is_initialized():
        try:
            print("🔥 Firebaseから全ワールドデータを取得中...")
            firebase_worlds = firebase_manager.get_all_vrchat_worlds()  # 全データ取得
            
            if firebase_worlds:
                print(f"✅ Firebaseから {len(firebase_worlds)} 件の全ワールドデータを取得しました")
                return jsonify({
                    'success': True,
                    'data': firebase_worlds,
                    'count': len(firebase_worlds),
                    'data_source': 'firebase'
                })
            else:
                print("⚠️ Firebaseにデータが見つかりません。サンプルデータを使用します")
                
        except Exception as e:
            print(f"❌ Firebase取得エラー: {e}")
            print("🔄 サンプルデータにフォールバックします")
    else:
        print("⚠️ Firebaseが初期化されていません。サンプルデータを使用します")
    
    # フォールバック: サンプルデータを返す
    return jsonify({
        'success': True,
        'data': sample_worlds,
        'count': len(sample_worlds),
        'data_source': 'sample'
    })

@app.route('/api/search-test')
def search_test():
    """検索機能のテスト用エンドポイント"""
    search_term = request.args.get('q', '')
    
    if firebase_manager.is_initialized():
        try:
            firebase_worlds = firebase_manager.get_vrchat_worlds(limit=10)
            if firebase_worlds and len(firebase_worlds) > 0:
                # 最初のアイテムの構造を確認
                first_item = firebase_worlds[0]
                
                return jsonify({
                    'search_term': search_term,
                    'total_items': len(firebase_worlds),
                    'first_item_keys': list(first_item.keys()),
                    'first_item_name': first_item.get('name', 'None'),
                    'first_item_title': first_item.get('title', 'None'),
                    'first_item_description_start': str(first_item.get('description', ''))[:100],
                    'search_in_name': search_term.lower() in str(first_item.get('name', '')).lower(),
                    'search_in_title': search_term.lower() in str(first_item.get('title', '')).lower(),
                    'search_in_description': search_term.lower() in str(first_item.get('description', '')).lower(),
                })
        except Exception as e:
            return jsonify({'error': str(e)})
    
    return jsonify({'error': 'Firebase not initialized'})

if __name__ == '__main__':
    print("🚀 TypeScript開発用テストサーバーを起動しています...")
    print("📍 URL: http://localhost:5000")
    print("💡 サンプルデータでAPIをテストできます")
    app.run(debug=True, host='0.0.0.0', port=5000)
