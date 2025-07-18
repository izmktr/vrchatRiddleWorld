"""
定期実行スケジューラー
"""

import schedule
import time
import logging
from datetime import datetime
from scraper import WebScraper

# ログ設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('scheduler.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def run_scheduled_scraping():
    """定期実行されるスクレイピング処理"""
    logger.info("=== 定期スクレイピング開始 ===")
    
    try:
        scraper = WebScraper()
        results = scraper.run_scheduled_scraping()
        logger.info(f"定期スクレイピング完了: {len(results)}件のデータを処理")
        
    except Exception as e:
        logger.error(f"定期スクレイピングエラー: {e}")
    
    logger.info("=== 定期スクレイピング終了 ===\n")

def main():
    """スケジューラーのメイン処理"""
    logger.info("スケジューラーを開始します...")
    
    # スケジュール設定
    schedule.every(1).hours.do(run_scheduled_scraping)  # 1時間ごと
    # schedule.every().day.at("09:00").do(run_scheduled_scraping)  # 毎日9時
    # schedule.every().monday.at("10:00").do(run_scheduled_scraping)  # 毎週月曜10時
    
    logger.info("スケジュール設定完了:")
    logger.info("- 1時間ごとにスクレイピング実行")
    
    # 初回実行
    logger.info("初回スクレイピングを実行します...")
    run_scheduled_scraping()
    
    # スケジュール実行ループ
    try:
        while True:
            schedule.run_pending()
            time.sleep(60)  # 1分ごとにチェック
            
    except KeyboardInterrupt:
        logger.info("スケジューラーを停止しました")
    except Exception as e:
        logger.error(f"スケジューラーエラー: {e}")

if __name__ == "__main__":
    main()
