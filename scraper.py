"""
Web Scraping Tool with Firebase Integration
メインのウェブスクレイピングスクリプト
"""

import requests
from bs4 import BeautifulSoup
import time
import logging
import argparse
from datetime import datetime
from typing import List, Dict, Optional
import os
from dotenv import load_dotenv

from firebase_config import FirebaseManager

# 環境変数の読み込み
load_dotenv()

# ログ設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('scraper.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class WebScraper:
    """ウェブスクレイピングクラス"""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        self.firebase_manager = FirebaseManager()
        
    def scrape_example_site(self, url: str) -> Optional[Dict]:
        """
        サンプルサイトのスクレイピング
        実際の使用時は対象サイトに合わせて修正してください
        """
        try:
            logger.info(f"スクレイピング開始: {url}")
            
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # サンプル: タイトルと説明を取得
            title = soup.find('title')
            title_text = title.get_text().strip() if title else "タイトルなし"
            
            # メタ説明を取得
            meta_desc = soup.find('meta', attrs={'name': 'description'})
            description = meta_desc.get('content', '') if meta_desc else ""
            
            # 見出しを取得
            headings = [h.get_text().strip() for h in soup.find_all(['h1', 'h2', 'h3'])]
            
            data = {
                'url': url,
                'title': title_text,
                'description': description,
                'headings': headings[:10],  # 最初の10個のみ
                'scraped_at': datetime.now().isoformat(),
                'content_length': len(response.content)
            }
            
            logger.info(f"スクレイピング完了: {title_text}")
            return data
            
        except requests.RequestException as e:
            logger.error(f"リクエストエラー {url}: {e}")
            return None
        except Exception as e:
            logger.error(f"スクレイピングエラー {url}: {e}")
            return None
    
    def scrape_multiple_urls(self, urls: List[str], delay: float = 1.0) -> List[Dict]:
        """
        複数URLのスクレイピング
        """
        results = []
        
        for i, url in enumerate(urls):
            logger.info(f"進行状況: {i+1}/{len(urls)}")
            
            data = self.scrape_example_site(url)
            if data:
                results.append(data)
                
                # Firebaseに保存
                try:
                    self.firebase_manager.save_scraped_data(data)
                    logger.info(f"Firebaseに保存完了: {data['title']}")
                except Exception as e:
                    logger.error(f"Firebase保存エラー: {e}")
            
            # レート制限のための待機
            if i < len(urls) - 1:
                time.sleep(delay)
        
        return results
    
    def run_scheduled_scraping(self):
        """
        定期実行用のメソッド
        """
        # サンプルURL（実際の使用時は対象URLリストに変更）
        sample_urls = [
            "https://example.com",
            "https://httpbin.org/html",
        ]
        
        logger.info("定期スクレイピング開始")
        results = self.scrape_multiple_urls(sample_urls)
        logger.info(f"定期スクレイピング完了: {len(results)}件のデータを処理")
        
        return results

def main():
    """メイン実行関数"""
    parser = argparse.ArgumentParser(description='ウェブスクレイピングツール')
    parser.add_argument('--vrchat', action='store_true', help='VRChatワールドをスクレイピング')
    parser.add_argument('--count', type=int, default=20, help='取得するワールド数（VRChat用）')
    parser.add_argument('--featured', action='store_true', help='フィーチャーワールドのみ（VRChat用）')
    parser.add_argument('--keyword', type=str, help='検索キーワード（VRChat用）')
    
    args = parser.parse_args()
    
    if args.vrchat:
        # VRChatスクレイピング
        try:
            from vrchat_scraper import VRChatWorldScraper
            vrchat_scraper = VRChatWorldScraper()
            
            print("VRChatワールドスクレイピングを開始します...")
            
            if args.keyword:
                print(f"キーワード '{args.keyword}' で検索中...")
                results = vrchat_scraper.search_worlds_by_keyword(args.keyword, args.count)
            elif args.featured:
                print("フィーチャーワールドを取得中...")
                results = vrchat_scraper.scrape_featured_worlds()
            else:
                print(f"人気ワールド {args.count}件を取得中...")
                results = vrchat_scraper.scrape_popular_worlds(args.count)
            
            print(f"\n結果: {len(results)}件のVRChatワールドデータを収集しました")
            for i, world in enumerate(results[:5], 1):
                print(f"{i}. {world['name']} (作者: {world['author_name']}, 人気: {world['popularity']}%)")
                
            if len(results) > 5:
                print(f"... 他 {len(results) - 5} 件")
                
            vrchat_scraper.cleanup()
            
        except ImportError as e:
            print(f"VRChatスクレイピングモジュールの読み込みに失敗: {e}")
        except Exception as e:
            print(f"VRChatスクレイピングエラー: {e}")
    
    else:
        # 通常のWebスクレイピング
        scraper = WebScraper()
        
        # サンプルURL（実際の使用時は対象URLリストに変更）
        sample_urls = [
            "https://example.com",
            "https://httpbin.org/html",
        ]
        
        print("ウェブスクレイピングツールを開始します...")
        results = scraper.scrape_multiple_urls(sample_urls)
        
        print(f"\n結果: {len(results)}件のデータを収集しました")
        for result in results:
            print(f"- {result['title']} ({result['url']})")

if __name__ == "__main__":
    main()
