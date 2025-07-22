"""
ローカル開発用のFlaskサーバー
Web表示のテスト用
"""

from flask import Flask, jsonify, send_from_directory, request
from flask_cors import CORS
import os
import logging
from typing import Any, Dict, List
from firebase_config import FirebaseManager

app = Flask(__name__)
CORS(app)  # CORS設定

# ログ設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# プロジェクトルートディレクトリのパス
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Firebase接続
firebase_manager = FirebaseManager()

@app.route('/')
def index():
    """メインページ"""
    try:
        with open(os.path.join(project_root, 'web', 'index.html'), 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        return "<h1>index.htmlが見つかりません</h1>", 404

@app.route('/manage-worlds.html')
def manage_worlds():
    """管理ページ"""
    try:
        with open(os.path.join(project_root, 'web', 'manage-worlds.html'), 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        return "<h1>manage-worlds.htmlが見つかりません</h1>", 404

# 静的ファイル配信（TypeScriptコンパイル済み）
@app.route('/src/<path:filename>')
def serve_src(filename):
    """srcフォルダの静的ファイル配信"""
    return send_from_directory(os.path.join(project_root, 'web', 'src'), filename)

@app.route('/vrchat_worlds.html')
def vrchat_worlds():
    """VRChatワールド表示ページ（互換性のため）"""
    try:
        with open(os.path.join(project_root, 'web', 'index.html'), 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        return "<h1>index.htmlが見つかりません</h1>", 404

@app.route('/dashboard.html')
def dashboard():
    """ダッシュボードページ（旧トップページ）"""
    try:
        with open(os.path.join(project_root, 'web', 'old_index.html'), 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        return "<h1>old_index.htmlが見つかりません</h1>", 404

@app.route('/manage_worlds.html')
def manage_worlds():
    """ワールド管理ページ"""
    try:
        with open(os.path.join(project_root, 'web', 'manage_worlds.html'), 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        return "<h1>manage_worlds.htmlが見つかりません</h1>", 404

@app.route('/web/<path:filename>')
def serve_web_files(filename: str):
    """Webファイルの配信"""
    return send_from_directory(os.path.join(project_root, 'web'), filename)

@app.route('/thumbnail/<path:filename>')
def serve_thumbnail_files(filename: str):
    """サムネイル画像の配信"""
    return send_from_directory(os.path.join(project_root, 'thumbnail'), filename)

@app.route('/api/data')
def get_data():
    """スクレイピングデータのAPI"""
    try:
        data: List[Dict[str, Any]] = firebase_manager.get_scraped_data(limit=100)  # type: ignore
        return jsonify({
            'success': True,
            'data': data,
            'count': len(data)  # type: ignore
        })
    except Exception as e:
        logger.error(f"データ取得エラー: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'data': []
        }), 500

@app.route('/api/vrchat_worlds')
def get_vrchat_worlds():
    """VRChatワールドデータのAPI（読み取り最適化版）"""
    try:
        # クエリパラメータから制限数を取得
        limit = request.args.get('limit', 30, type=int)
        limit = min(limit, 100)  # 最大100件に制限
        
        data: List[Dict[str, Any]] = firebase_manager.get_vrchat_worlds(limit=limit)  # type: ignore
        
        # 統計情報の取得を無効化（緊急: 追加読み取りを防止）
        # stats = None
        # try:
        #     if limit > 100:  # 大量データ取得時のみ統計も取得
        #         stats = firebase_manager.get_stats()
        # except Exception as e:
        #     logger.warning(f"統計取得失敗: {e}")
        
        response_data: Dict[str, Any] = {  # type: ignore
            'success': True,
            'worlds': data,
            'count': len(data),  # type: ignore
            'reads_used': len(data),  # 実際の読み取り数を表示  # type: ignore
            'limit_applied': limit  # 適用された制限を表示
        }
        
        # 緊急: 統計情報の取得を無効化
        # if stats:
        #     response_data['stats'] = stats
            
        return jsonify(response_data)
    except Exception as e:
        logger.error(f"VRChatワールドデータ取得エラー: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'worlds': []
        }), 500

@app.route('/api/vrchat_worlds/all')
def get_all_vrchat_worlds():
    """全VRChatワールドデータのAPI（制限なし）"""
    try:
        data: List[Dict[str, Any]] = firebase_manager.get_all_vrchat_worlds()  # type: ignore
        
        response_data: Dict[str, Any] = {  # type: ignore
            'success': True,
            'worlds': data,
            'count': len(data),  # type: ignore
            'reads_used': len(data),  # 実際の読み取り数を表示  # type: ignore
            'limit_applied': None  # 制限なし
        }
            
        return jsonify(response_data)
    except Exception as e:
        logger.error(f"全VRChatワールドデータ取得エラー: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'worlds': []
        }), 500

@app.route('/api/stats')
def get_stats():
    """統計情報のAPI"""
    try:
        stats: Dict[str, Any] = firebase_manager.get_stats()  # type: ignore
        return jsonify({
            'success': True,
            'stats': stats
        })
    except Exception as e:
        logger.error(f"統計取得エラー: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/vrchat_world/<world_id>')
def get_vrchat_world(world_id: str):
    """VRChatワールド詳細取得"""
    try:
        world_data = firebase_manager.get_vrchat_world_by_id(world_id)  # type: ignore
        if world_data:
            return jsonify({
                'success': True,
                'data': world_data
            })
        else:
            return jsonify({
                'success': False,
                'error': 'ワールドが見つかりません'
            }), 404
    except Exception as e:
        logger.error(f"ワールド取得エラー: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/vrchat_world/<world_id>', methods=['PUT'])
def update_vrchat_world(world_id: str):
    """VRChatワールド更新"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': '更新データが必要です'
            }), 400
        
        # idフィールドは更新対象から除外
        update_data = {k: v for k, v in data.items() if k != 'id'}
        
        success = firebase_manager.update_vrchat_world(world_id, update_data)  # type: ignore
        if success:
            return jsonify({
                'success': True,
                'message': 'ワールドが更新されました'
            })
        else:
            return jsonify({
                'success': False,
                'error': '更新に失敗しました'
            }), 500
    except Exception as e:
        logger.error(f"ワールド更新エラー: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/vrchat_world/<world_id>', methods=['DELETE'])
def delete_vrchat_world(world_id: str):
    """VRChatワールド削除"""
    try:
        success = firebase_manager.delete_vrchat_world(world_id)  # type: ignore
        if success:
            return jsonify({
                'success': True,
                'message': 'ワールドが削除されました'
            })
        else:
            return jsonify({
                'success': False,
                'error': '削除に失敗しました'
            }), 500
    except Exception as e:
        logger.error(f"ワールド削除エラー: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/edit_world.html')
def edit_world():
    """ワールド編集ページ"""
    try:
        with open(os.path.join(project_root, 'web', 'edit_world.html'), 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        return "<h1>edit_world.htmlが見つかりません</h1>", 404

@app.route('/api/health')
def health_check():
    """ヘルスチェック"""
    return jsonify({
        'status': 'healthy',
        'firebase_connected': firebase_manager.db is not None
    })

if __name__ == '__main__':
    logger.info("Flask開発サーバーを開始します...")
    logger.info("URL: http://localhost:5000")
    
    # 開発モードで実行
    app.run(
        host='127.0.0.1',
        port=5000,
        debug=True,
        threaded=True
    )
