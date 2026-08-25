# 104 職缺追蹤 + Discord 通知

這個專案會：

1. 每小時自動到 104 人力銀行，依照你設定的「關鍵字」和「公司清單」抓目前的職缺。
2. 找出「上次檢查之後才新出現」的職缺，發 Discord 通知給你。
3. 把抓到的所有職缺整理成一個網站（用 GitHub Pages 架設），你可以搜尋、篩選、標記投遞狀態。

整個流程完全免費，跑在 GitHub 自己的伺服器上（GitHub Actions），就算你的電腦關機，
排程一樣會照常執行。

---

## 你需要準備

- 一個 GitHub 帳號（沒有的話到 [github.com](https://github.com) 免費註冊）
- 一個 Discord 伺服器，而且你有權限新增 Webhook（自己的伺服器一定可以）

---

## 步驟一：建立 GitHub Repository

1. 登入 GitHub，右上角「+」→「New repository」。
2. Repository name 隨意，例如 `104-job-tracker`。
3. 建議設成 **Public**（GitHub Pages 對免費帳號來說，Public repo 才能直接啟用；
   職缺資料本身沒有隱私疑慮，只是你關注的職缺清單，如果會介意，也可以設 Private，
   但那樣 GitHub Pages 網站功能需要付費方案才能用）。
4. 建立完成後，把這個資料夾裡的所有檔案上傳上去（用網頁上的「Add file → Upload files」
   拖曳整包上傳最簡單；熟悉 git 的話也可以 `git init && git add . && git commit && git push`）。

---

## 步驟二：建立 Discord Webhook

1. 打開 Discord，到你想收到通知的頻道。
2. 頻道設定（頻道名稱旁邊的齒輪圖示）→「整合 Integrations」→「Webhook」→「新增 Webhook」。
3. 幫它取個名字（例如「104職缺通知」），選好要發送到的頻道。
4. 按「複製 Webhook 網址」，把這串網址存起來（長得像
   `https://discord.com/api/webhooks/xxxxxxxx/yyyyyyyyyyyyyyyyyyyy`）。

---

## 步驟三：把 Webhook 網址設成 GitHub Secret

1. 到你的 repo 頁面 → 上方 **Settings** → 左側選單 **Secrets and variables → Actions**。
2. 按「New repository secret」。
3. Name 填：`DISCORD_WEBHOOK_URL`
4. Value 貼上剛剛複製的 Discord Webhook 網址。
5. 按「Add secret」。

這一步很重要，沒設定的話排程會照常抓職缺，但不會發 Discord 通知。

---

## 步驟四：啟用 GitHub Pages（追蹤網站）

1. 到 repo 的 **Settings → Pages**。
2. Source 選「Deploy from a branch」。
3. Branch 選 `main`，資料夾選 `/ (root)`。
4. 存檔後等 1-2 分鐘，頁面會顯示網站網址，長得像：
   `https://你的帳號.github.io/104-job-tracker/`
5. 打開這個網址，就是你的職缺追蹤網站。剛開始因為還沒有資料，列表會是空的，
   等第一次排程跑完（或你手動觸發一次，見步驟六）就會有內容。

---

## 步驟五：設定你想追蹤的關鍵字 / 公司

打開 repo 裡的 `config.json`，直接在 GitHub 網頁上點檔案 →「✏️ 編輯」，
改成你要的內容，例如：

```json
{
  "keywords": ["後端工程師", "資料分析師"],
  "companies": [
    { "name": "範例科技股份有限公司", "id": "1a2x6bmzbo" }
  ],
  "maxPagesPerKeyword": 1,
  "notifyOnFirstRun": false
}
```

- **keywords**：你想搜尋的職稱或關鍵字，跟你在 104 搜尋框輸入的字一樣。
- **companies**：只追蹤特定公司時使用。`id` 是 104 給每間公司的代碼，取得方式：
  到 104 上搜尋該公司、點進公司頁面，網址會長得像
  `https://www.104.com.tw/company/1a2x6bmzbo`，最後那串 `1a2x6bmzbo` 就是公司 ID。
- **notifyOnFirstRun**：第一次執行時，通常會一次抓到很多「本來就存在」的職缺，
  預設 `false` 代表第一次不發通知（只建立基準資料），之後才開始通知真正的新職缺。
  如果你想第一次就把目前所有符合條件的職缺都收到 Discord，改成 `true`。

改好之後直接在 GitHub 網頁上按「Commit changes」存檔即可，不需要重新部署任何東西。

> 你也可以透過網站頁面下方「⚙️ 設定」直接新增/刪除關鍵字與公司，
> 但那個功能需要多一個步驟設定 GitHub Token，詳見下方「網站上直接編輯設定（進階）」。

---

## 步驟六：手動測試一次

不用等到下一個整點，你可以立刻測試：

1. 到 repo 的 **Actions** 分頁。
2. 左側選「檢查104新職缺並通知Discord」。
3. 右邊「Run workflow」按鈕 → 再按一次綠色的「Run workflow」。
4. 等它跑完（通常 1-3 分鐘，第一次會比較久，因為要下載瀏覽器），
   點進去可以看到詳細 log。
5. 如果一切正常：
   - 第一次執行：Discord 不會收到訊息（除非你把 `notifyOnFirstRun` 設成 `true`），
     但 `data/jobs.json` 會被更新、追蹤網站會開始有資料。
   - 之後每次執行：只要抓到「新」職缺，就會發 Discord 通知。

之後它會照 `.github/workflows/check-jobs.yml` 裡的排程，**每小時自動執行一次**，
不需要你手動做任何事。

---

## 網站上直接編輯設定（進階，非必要）

追蹤網站本身是靜態網頁，沒辦法自己寫檔案，所以「在網站上新增關鍵字/公司」
需要一組有這個 repo 寫入權限的 GitHub Token，讓網站直接呼叫 GitHub API 幫你存檔：

1. GitHub 右上角頭像 → **Settings → Developer settings → Personal access tokens
   → Fine-grained tokens → Generate new token**。
2. Repository access 選「Only select repositories」，選你這個 repo。
3. Permissions 裡把 **Contents** 設成 **Read and write**，
   如果也想用網站上的「立即觸發檢查」按鈕，**Actions** 也設成 **Read and write**。
4. 產生後複製 Token（只會顯示一次）。
5. 到追蹤網站下方「⚙️ 設定」，填入 `owner/repo`（例如 `zack/104-job-tracker`）
   和這組 Token，按「儲存」。

Token 只會存在你瀏覽器的 localStorage，不會被送到除了 GitHub 以外的任何地方。
如果不想用這個功能，直接照步驟五在 GitHub 網頁上編輯 `config.json` 就好，效果一樣。

---

## 職缺狀態標記（已投遞 / 已面試 / 已婉拒…）

網站上每筆職缺右下角可以選狀態，這個標記存在**你目前這個瀏覽器**裡，
換瀏覽器或清除瀏覽器資料就會消失（不會同步到別的裝置）。這是為了保持整個
系統簡單、不需要額外的資料庫。

---

## 常見問題

**多久檢查一次？**
預設每小時一次（`.github/workflows/check-jobs.yml` 裡的 `cron: "5 * * * *"`）。
GitHub 排程本身可能會有幾分鐘誤差，是正常現象。

**為什麼有些職缺標示「可能已下架」？**
每次檢查只會看關鍵字搜尋結果的第一頁、或公司目前開放的職缺，如果某筆職缺這次沒有
再出現（可能是下架了，也可能只是排到比較後面），會保留歷史紀錄但標成非目前可見，
不會直接刪除。

**104 改版怎麼辦？**
這支腳本是靠讀取 104 網頁上的特定區塊（CSS class）來抓資料，如果 104 大改版，
可能會抓不到職缺。到時候 Actions 執行紀錄會顯示「抓到 0 筆」，可以再回來請我
幫忙更新 `scripts/check-jobs.mjs` 裡的選擇器。

**GitHub Actions 的 IP 會不會被 104 擋掉？**
目前測試是正常的，但不保證長期穩定（一般網站的防爬機制可能隨時調整）。
如果之後發現排程一直抓不到資料，可以考慮改成在自己電腦上跑（用工作排程器
本機執行 `node scripts/check-jobs.mjs`），跟我說一聲我可以幫你調整成本機版本。

**費用？**
GitHub Actions 對 Public repo 完全免費；Private repo 每月有免費額度，
一小時跑 2-3 分鐘、一天 24 次的用量遠低於免費額度。
