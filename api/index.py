from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import sys
import json
from datetime import datetime, timezone

# パスを追加してローカルモジュールをインポート
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    # Vercel環境用のFirebase設定を使用
    from api.firebase_config import db, get_all_worlds
except ImportError:
    try:
        # ローカル環境用のFirebase設定をフォールバック
        from python.firebase_config import db, get_all_worlds
    except ImportError:
        # Firebase利用不可の場合
        db = None
        def get_all_worlds():
            return []

app = Flask(__name__)
CORS(app)

@app.route('/api/vrchat_worlds', methods=['GET'])
def get_vrchat_worlds():
    """VRChatワールドデータを取得（制限付き）"""
    try:
        limit = int(request.args.get('limit', 100))
        
        if db is None:
            return jsonify({
                'success': False,
                'error': 'Database not available',
                'worlds': [],
                'count': 0,
                'limit_applied': limit
            })
        
        worlds = get_all_worlds()
        
        # 制限を適用
        limited_worlds = worlds[:limit] if limit > 0 else worlds
        
        return jsonify({
            'success': True,
            'worlds': limited_worlds,
            'count': len(limited_worlds),
            'total_available': len(worlds),
            'limit_applied': limit,
            'reads_used': len(limited_worlds)
        })
        
    except Exception as e:
        print(f"Error in get_vrchat_worlds: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'worlds': [],
            'count': 0
        }), 500

@app.route('/api/vrchat_worlds/all', methods=['GET'])
def get_all_vrchat_worlds():
    """全てのVRChatワールドデータを取得（制限なし）"""
    try:
        if db is None:
            return jsonify({
                'success': False,
                'error': 'Database not available',
                'worlds': [],
                'count': 0
            })
        
        worlds = get_all_worlds()
        
        return jsonify({
            'success': True,
            'worlds': worlds,
            'count': len(worlds),
            'limit_applied': None,
            'reads_used': len(worlds)
        })
        
    except Exception as e:
        print(f"Error in get_all_vrchat_worlds: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'worlds': [],
            'count': 0
        }), 500

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """統計情報を取得"""
    try:
        if db is None:
            return jsonify({
                'success': False,
                'error': 'Database not available',
                'stats': {'total_worlds': 0}
            })
        
        worlds = get_all_worlds()
        
        # 基本統計
        total_worlds = len(worlds)
        total_visits = sum(world.get('visits', 0) for world in worlds)
        total_favorites = sum(world.get('favorites', 0) for world in worlds)
        avg_popularity = sum(world.get('popularity', 0) for world in worlds) / total_worlds if total_worlds > 0 else 0
        
        # 今日更新されたワールド数
        today = datetime.now(timezone.utc).date()
        today_updated = 0
        for world in worlds:
            try:
                scraped_at = world.get('scraped_at')
                if scraped_at:
                    if isinstance(scraped_at, str):
                        update_date = datetime.fromisoformat(scraped_at.replace('Z', '+00:00')).date()
                    else:
                        update_date = scraped_at.date()
                    
                    if update_date == today:
                        today_updated += 1
            except:
                continue
        
        return jsonify({
            'success': True,
            'stats': {
                'total_worlds': total_worlds,
                'today_updated': today_updated,
                'total_visits': total_visits,
                'total_favorites': total_favorites,
                'avg_popularity': round(avg_popularity, 1)
            }
        })
        
    except Exception as e:
        print(f"Error in get_stats: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'stats': {'total_worlds': 0}
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """ヘルスチェックエンドポイント"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'database_connected': db is not None
    })

# Vercel用のハンドラー
def handler(request):
    return app(request.environ, lambda status, headers: None)

if __name__ == '__main__':
    app.run(debug=True)
