# PowerShell版コミットメッセージチェッカー
param($MessageFile)

$commitRegex = '^\[(機能追加|修正|更新|削除|設定|文書|テスト|リファクタ)\]'

$errorMsg = @"
エラー: コミットメッセージは日本語の推奨形式に従ってください

推奨形式: [種類] 変更内容の説明

種類の例:
- [機能追加] - 新機能の追加
- [修正] - バグ修正  
- [更新] - 既存機能の改善・更新
- [削除] - 機能・コードの削除
- [設定] - 設定ファイルの変更
- [文書] - ドキュメントの更新
- [テスト] - テスト関連の変更
- [リファクタ] - コードの整理・リファクタリング

例: [機能追加] VRChatワールドのサムネイル表示機能
"@

if ($MessageFile -and (Test-Path $MessageFile)) {
    $firstLine = Get-Content $MessageFile | Select-Object -First 1
    
    if ($firstLine -notmatch $commitRegex) {
        Write-Error $errorMsg
        Write-Host ""
        Write-Host "現在のコミットメッセージ:"
        Get-Content $MessageFile
        exit 1
    }
} else {
    Write-Host "使用方法: .\commit-msg-check.ps1 <commit-message-file>"
    exit 1
}
