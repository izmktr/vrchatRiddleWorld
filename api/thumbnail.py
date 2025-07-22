from flask import Flask, send_from_directory, abort
import os

app = Flask(__name__)

@app.route('/thumbnail/<filename>')
def serve_thumbnail(filename):
    """サムネイル画像を提供"""
    try:
        # プロジェクトルートのthumbnailディレクトリを指定
        thumbnail_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'thumbnail')
        
        if not os.path.exists(thumbnail_dir):
            abort(404)
        
        return send_from_directory(thumbnail_dir, filename)
    except Exception as e:
        print(f"Error serving thumbnail {filename}: {e}")
        abort(404)

# Vercel用のハンドラー
def handler(request):
    return app(request.environ, lambda status, headers: None)

if __name__ == '__main__':
    app.run(debug=True)
