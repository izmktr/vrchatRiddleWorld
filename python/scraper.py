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
from typing import List, Dict, Optional, Any
# import os  # 今後の拡張用に残しておく
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
        
    def scrape_example_site(self, url: str) -> Optional[Dict[str, Any]]:
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
            description = ""
            if meta_desc:
                try:
                    description = str(meta_desc.get('content', ''))  # type: ignore
                except:
                    description = ""
            
            # 見出しを取得
            headings = [h.get_text().strip() for h in soup.find_all(['h1', 'h2', 'h3'])]
            
            data: Dict[str, Any] = {
                'url': url,
                'title': title_text,
                'description': str(description),
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
    
    def scrape_multiple_urls(self, urls: List[str], delay: float = 1.0) -> List[Dict[str, Any]]:
        """
        複数URLのスクレイピング
        """
        results: List[Dict[str, Any]] = []
        
        for i, url in enumerate(urls):
            logger.info(f"進行状況: {i+1}/{len(urls)}")
            
            data = self.scrape_example_site(url)
            if data:
                results.append(data)
                
                # Firebaseに保存
                try:
                    self.firebase_manager.save_scraped_data(data)  # type: ignore
                    logger.info(f"Firebaseに保存完了: {data['title']}")
                except Exception as e:
                    logger.error(f"Firebase保存エラー: {e}")
            
            # レート制限のための待機
            if i < len(urls) - 1:
                time.sleep(delay)
        
        return results
    
    def run_scheduled_scraping(self) -> List[Dict[str, Any]]:
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
    parser.add_argument('--vrchat-url', type=str, help='VRChatワールドURLを直接指定')
    parser.add_argument('--vrchat-file', type=str, help='VRChatワールドURLリストファイルを指定')
    parser.add_argument('--count', type=int, default=20, help='取得するワールド数（VRChat用）')
    parser.add_argument('--featured', action='store_true', help='フィーチャーワールドのみ（VRChat用）')
    parser.add_argument('--keyword', type=str, help='検索キーワード（VRChat用）')
    parser.add_argument('--delay', type=float, default=2.0, help='リクエスト間の待機時間（秒）')
    
    args = parser.parse_args()
    
    if args.vrchat or args.vrchat_url or args.vrchat_file:
        # VRChatスクレイピング
        try:
            from vrchat_scraper import VRChatWorldScraper
            vrchat_scraper = VRChatWorldScraper()
            
            if args.vrchat_url:
                print(f"VRChatワールドURL {args.vrchat_url} をスクレイピングします...")
                world_info = vrchat_scraper.scrape_world_by_url(args.vrchat_url)  # type: ignore
                
                if world_info:
                    print("\n=== VRChatワールド情報 ===")
                    print(f"ワールドID: {world_info['world_id']}")
                    print(f"タイトル: {world_info['title']}")
                    print(f"制作者: {world_info['creator']}")
                    print(f"サムネイル: {world_info['thumbnail_url']}")
                    print(f"説明: {world_info['description']}")
                    print(f"定員: {world_info['capacity']}")
                    print(f"公開日: {world_info['published']}")
                    print(f"取得日時: {world_info['scraped_at']}")
                    
                    # Firebaseに保存
                    try:
                        vrchat_scraper.firebase_manager.save_vrchat_world_data(world_info)  # type: ignore
                        print("\nFirebaseに保存完了しました")
                    except Exception as e:
                        print(f"Firebase保存エラー: {e}")
                else:
                    print("ワールド情報の取得に失敗しました")
                    
            elif args.vrchat_file:
                print(f"VRChatワールドURLリストファイル {args.vrchat_file} からバッチ処理します...")
                results = vrchat_scraper.scrape_worlds_from_file(args.vrchat_file)  # type: ignore
                
                if results:
                    print(f"\n=== バッチ処理結果 ===")
                    print(f"✅ 成功: {len(results)}件のワールドデータを取得しました")  # type: ignore
                    
                    # 結果の概要を表示
                    print("\n📊 取得したワールド一覧:")
                    for i, world in enumerate(results[:5], 1):  # type: ignore
                        print(f"{i}. {world.get('title', 'Unknown')} (作者: {world.get('creator', 'Unknown')})")  # type: ignore
                    
                    if len(results) > 5:  # type: ignore
                        print(f"... 他 {len(results) - 5} 件")  # type: ignore
                    
                    # 統計情報
                    total_capacity = sum(int(w.get('capacity', 0)) if str(w.get('capacity', '')).isdigit() else 0 for w in results)  # type: ignore
                    print(f"\n📈 統計情報:")
                    print(f"・合計定員: {total_capacity}人")
                    print(f"・平均定員: {total_capacity // len(results) if results else 0}人")  # type: ignore
                    
                else:
                    print("❌ ワールドデータの取得に失敗しました")
                    
            else:
                print("VRChatワールドスクレイピングを開始します...")
                
                if args.keyword:
                    print(f"キーワード '{args.keyword}' で検索中...")
                    results = vrchat_scraper.search_worlds_by_keyword(args.keyword, args.count)  # type: ignore
                elif args.featured:
                    print("フィーチャーワールドを取得中...")
                    results = vrchat_scraper.scrape_featured_worlds()  # type: ignore
                else:
                    print(f"人気ワールド {args.count}件を取得中...")
                    results = vrchat_scraper.scrape_popular_worlds(args.count)  # type: ignore
                
                print(f"\n結果: {len(results)}件のVRChatワールドデータを収集しました")  # type: ignore
                for i, world in enumerate(results[:5], 1):  # type: ignore
                    print(f"{i}. {world['name']} (作者: {world['author_name']}, 人気: {world['popularity']}%)")  # type: ignore
                    
                if len(results) > 5:  # type: ignore
                    print(f"... 他 {len(results) - 5} 件")  # type: ignore
                
        except ImportError as e:
            print(f"VRChatスクレイピングモジュールの読み込みに失敗: {e}")
        except Exception as e:
            print(f"VRChatスクレイピングエラー: {e}")
        finally:
            # エラーの有無に関わらずクリーンアップ
            try:
                if 'vrchat_scraper' in locals():
                    vrchat_scraper.cleanup()  # type: ignore
            except:
                pass  # クリーンアップエラーは無視
    
    else:
        # 通常のWebスクレイピング
        scraper = WebScraper()
        
        # サンプルURL（実際の使用時は対象URLリストに変更）
        sample_urls = [
            "https://example.com",
            "https://httpbin.org/html",
        ]
        
        print("ウェブスクレイピングツールを開始します...")
        results = scraper.scrape_multiple_urls(sample_urls)  # type: ignore
        
        print(f"\n結果: {len(results)}件のデータを収集しました")
        for result in results:
            print(f"- {result['title']} ({result['url']})")

if __name__ == "__main__":
    main()
