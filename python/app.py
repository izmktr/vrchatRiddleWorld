"""
ローカル開発用のFlaskサーバー
Web表示のテスト用
"""

from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
import os
import logging
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

@app.route('/vrchat_worlds.html')
def vrchat_worlds():
    """VRChatワールド表示ページ"""
    try:
        with open(os.path.join(project_root, 'web', 'vrchat_worlds.html'), 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        return "<h1>vrchat_worlds.htmlが見つかりません</h1>", 404

@app.route('/web/<path:filename>')
def serve_web_files(filename):
    """Webファイルの配信"""
    return send_from_directory(os.path.join(project_root, 'web'), filename)

@app.route('/thumbnail/<path:filename>')
def serve_thumbnail_files(filename):
    """サムネイル画像の配信"""
    return send_from_directory(os.path.join(project_root, 'thumbnail'), filename)

@app.route('/api/data')
def get_data():
    """スクレイピングデータのAPI"""
    try:
        data = firebase_manager.get_scraped_data(limit=100)
        return jsonify({
            'success': True,
            'data': data,
            'count': len(data)
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
    """VRChatワールドデータのAPI"""
    try:
        data = firebase_manager.get_vrchat_worlds(limit=1000)  # VRChatワールド専用メソッドを使用
        return jsonify({
            'success': True,
            'worlds': data,
            'count': len(data)
        })
    except Exception as e:
        logger.error(f"VRChatワールドデータ取得エラー: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'worlds': []
        }), 500

@app.route('/api/stats')
def get_stats():
    """統計情報のAPI"""
    try:
        stats = firebase_manager.get_stats()
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
