#!/usr/bin/env python3
"""
VRChat 2FA認証ヘルパースクリプト
メールで受信した2FAコードを入力するためのユーティリティ
"""

import os
import sys
from pathlib import Path

def wait_for_2fa_code():
    """2FAコードの入力を待機"""
    print("\n" + "="*50)
    print("🔐 VRChat 2FA認証が必要です")
    print("="*50)
    print("📧 メールに送信された6桁のコードを確認してください")
    print("💡 コードを.envファイルに設定するか、ここで入力してください")
    print("")
    
    while True:
        try:
            code = input("📝 2FA認証コード (6桁): ").strip()
            
            if len(code) == 6 and code.isdigit():
                # .envファイルに一時的に保存
                env_file = Path('.env')
                if env_file.exists():
                    with open(env_file, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # 既存の2FAコード行を削除
                    lines = content.split('\n')
                    lines = [line for line in lines if not line.startswith('VRCHAT_2FA_CODE=')]
                    
                    # 新しいコードを追加
                    lines.append(f'VRCHAT_2FA_CODE={code}')
                    
                    with open(env_file, 'w', encoding='utf-8') as f:
                        f.write('\n'.join(lines))
                    
                    print(f"✅ 2FAコード '{code}' を.envファイルに保存しました")
                    print("🚀 バッチ処理を再実行してください")
                    break
                else:
                    print("❌ .envファイルが見つかりません")
                    break
            else:
                print("❌ 6桁の数字を入力してください")
                
        except KeyboardInterrupt:
            print("\n❌ 認証がキャンセルされました")
            sys.exit(1)
        except Exception as e:
            print(f"❌ エラー: {e}")
            sys.exit(1)

if __name__ == "__main__":
    wait_for_2fa_code()
