#!/bin/bash
# 把排程安裝到你的 Mac（只需要執行一次）。
# 用法：在 Terminal 裡 cd 到專案資料夾後執行：
#   bash launchd/install.sh

set -euo pipefail
PLIST_NAME="com.zack.104-job-tracker.plist"
SRC="$(cd "$(dirname "$0")" && pwd)/$PLIST_NAME"
DEST="$HOME/Library/LaunchAgents/$PLIST_NAME"

mkdir -p "$HOME/Library/LaunchAgents"
cp "$SRC" "$DEST"

# 如果之前裝過舊版，先卸載乾淨再重新載入
launchctl unload "$DEST" 2>/dev/null || true
launchctl load "$DEST"

echo ""
echo "已安裝排程！之後每小時的第5分會自動執行一次（現在也會馬上先跑一次測試）。"
echo "確認方式："
echo "  launchctl list | grep 104-job-tracker      # 看排程是否有註冊"
echo "  tail -f logs/check.log                     # 看實際執行結果（抓到幾筆、有沒有報錯）"
echo ""
echo "如果之後想移除排程："
echo "  launchctl unload ~/Library/LaunchAgents/$PLIST_NAME"
echo "  rm ~/Library/LaunchAgents/$PLIST_NAME"
