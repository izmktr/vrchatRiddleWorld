"""
VRChatワールドデータCSVエクスポート用バッチ処理スクリプト
"""

import sys
import argparse
import logging
from typing import List
from csv_exporter import VRChatWorldCSVExporter

def main():
    """コマンドライン引数を処理してCSVエクスポートを実行"""
    
    parser = argparse.ArgumentParser(
        description='Firebase VRChatワールドデータをCSVでエクスポート',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
使用例:
  python export_csv.py --all                              # 全データをエクスポート
  python export_csv.py --popular 100                      # 人気トップ100をエクスポート
  python export_csv.py --visits 1000                      # 訪問数1000以上
  python export_csv.py --visits 500 --favorites 100       # 複数条件
  python export_csv.py --author "username"                # 特定作者のワールド
  python export_csv.py --status "public"                  # 公開ワールドのみ
  python export_csv.py --stats                            # 統計情報のみ表示
        '''
    )
    
    # エクスポートタイプ
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--all', action='store_true', 
                      help='全てのワールドデータをエクスポート')
    group.add_argument('--popular', type=int, metavar='N',
                      help='人気度トップN件をエクスポート（例: --popular 50）')
    group.add_argument('--filter', action='store_true',
                      help='条件を指定してフィルタリングエクスポート')
    group.add_argument('--stats', action='store_true',
                      help='統計情報のみを表示（エクスポートしない）')
    
    # フィルタリング条件
    parser.add_argument('--visits', type=int, metavar='N',
                       help='最小訪問数を指定（例: --visits 1000）')
    parser.add_argument('--popularity', type=int, metavar='N',
                       help='最小人気度を指定（例: --popularity 50）')
    parser.add_argument('--favorites', type=int, metavar='N',
                       help='最小お気に入り数を指定（例: --favorites 100）')
    parser.add_argument('--author', type=str, metavar='NAME',
                       help='作者名を指定（部分一致）（例: --author "username"）')
    parser.add_argument('--status', type=str, metavar='STATUS',
                       help='リリースステータスを指定（例: --status "public"）')
    
    # 出力オプション
    parser.add_argument('--filename', type=str, metavar='FILENAME',
                       help='出力ファイル名を指定（例: --filename "my_export.csv"）')
    parser.add_argument('--quiet', '-q', action='store_true',
                       help='詳細なログ出力を抑制')
    
    args = parser.parse_args()
    
    # ログレベル設定
    if args.quiet:
        logging.getLogger().setLevel(logging.WARNING)
    else:
        logging.getLogger().setLevel(logging.INFO)
    
    try:
        exporter = VRChatWorldCSVExporter()
        
        # 統計情報のみ表示
        if args.stats:
            stats = exporter.get_export_statistics()
            print("\n=== VRChatワールドデータ統計 ===")
            print(f"総ワールド数: {stats['total_count']:,}")
            print(f"総訪問数: {stats['total_visits']:,}")
            print(f"総お気に入り数: {stats['total_favorites']:,}")
            print(f"平均人気度: {stats['average_popularity']}")
            print(f"最大人気度: {stats['max_popularity']:,}")
            print(f"ユニーク作者数: {stats['unique_authors']:,}")
            print(f"リリースステータス分布:")
            for status, count in stats['release_status_distribution'].items():
                print(f"  {status}: {count:,} 件")
            return
        
        # 全データエクスポート
        if args.all:
            print("全ワールドデータをエクスポート中...")
            filepath = exporter.export_all_worlds_to_csv(filename=args.filename)
            
        # 人気度トップN
        elif args.popular:
            print(f"人気度トップ {args.popular} をエクスポート中...")
            filepath = exporter.export_popular_worlds_csv(
                top_count=args.popular, 
                filename=args.filename
            )
            
        # 条件付きフィルタリング
        elif args.filter or any([args.visits, args.popularity, args.favorites, args.author, args.status]):
            print("条件に基づくフィルタリングエクスポート中...")
            
            # 条件を表示
            conditions: List[str] = []
            if args.visits: conditions.append(f"訪問数 {args.visits:,} 以上")
            if args.popularity: conditions.append(f"人気度 {args.popularity:,} 以上")
            if args.favorites: conditions.append(f"お気に入り {args.favorites:,} 以上")
            if args.author: conditions.append(f"作者名に '{args.author}' を含む")
            if args.status: conditions.append(f"ステータス '{args.status}'")
            
            if conditions:
                print(f"フィルタリング条件: {', '.join(conditions)}")
            
            filepath = exporter.export_worlds_by_criteria(
                min_visits=args.visits,
                min_popularity=args.popularity,
                min_favorites=args.favorites,
                author_name=args.author,
                release_status=args.status,
                filename=args.filename
            )
        
        else:
            print("エクスポートタイプが指定されていません。--help を参照してください。")
            return
        
        if filepath:
            print(f"\n✅ エクスポート完了: {filepath}")
            
            # ファイルサイズを表示
            try:
                import os
                file_size = os.path.getsize(filepath)
                if file_size > 1024 * 1024:
                    print(f"📁 ファイルサイズ: {file_size / (1024 * 1024):.1f} MB")
                elif file_size > 1024:
                    print(f"📁 ファイルサイズ: {file_size / 1024:.1f} KB")
                else:
                    print(f"📁 ファイルサイズ: {file_size} bytes")
            except:
                pass
        else:
            print("❌ エクスポートに失敗しました。")
            
    except KeyboardInterrupt:
        print("\n⚠️ ユーザーによって処理が中断されました")
        sys.exit(1)
    except Exception as e:
        print(f"❌ エラー: {e}")
        if not args.quiet:
            import traceback
            traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
