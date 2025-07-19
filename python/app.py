"""
ローカル開発用のFlaskサーバー
Web表示のテスト用
"""

from flask import Flask, render_template_string, jsonify, send_from_directory
from flask_cors import CORS
import os
import logging
from firebase_config import FirebaseManager

app = Flask(__name__)
CORS(app)  # CORS設定

# ログ設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Firebase接続
firebase_manager = FirebaseManager()

@app.route('/')
def index():
    """メインページ"""
    try:
        with open('web/index.html', 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        return "<h1>index.htmlが見つかりません</h1>", 404

@app.route('/web/<path:filename>')
def serve_web_files(filename):
    """Webファイルの配信"""
    return send_from_directory('web', filename)

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
