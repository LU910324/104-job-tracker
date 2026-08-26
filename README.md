# 104 職缺追蹤 + Discord 通知

這個專案會：

1. 每小時自動到 104 人力銀行，依照你設定的「關鍵字」和「公司清單」抓目前的職缺。
2. 找出「上次檢查之後才新出現」的職缺，發 Discord 通知給你。
3. 把抓到的所有職缺整理成一個網站（用 GitHub Pages 架設），你可以搜尋、篩選、標記投遞狀態。

> ⚠️ **重要更新**：原本設計是排程完全跑在 GitHub Actions（免開電腦）。但實測發現
> 104 人力銀行的 Cloudflare 防護機制，幾乎必定會擋下 GitHub Actions 用的「機房 IP」
> （公司頁面直接跳出人機驗證頁面、關鍵字搜尋回傳0筆），這是 IP 信譽問題，
> 跟程式碼寫得好不好無關，改程式碼也解不了。
>
> 所以排程改成**在你自己的電腦上執行**（用你家裡/公司網路的IP，104不會擋），
> 詳見下面「步驟六：在自己的電腦上排程執行」。GitHub Actions 的設定還留著，
> 但只能拿來手動測試/除錯用，不會再自動幫你抓職缺。

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

## 步驟六：在自己的電腦上排程執行（目前唯一穩定可靠的方式）

因為 104 的 Cloudflare 防護會擋下 GitHub Actions 的機房 IP，實際抓職缺的排程
改成用你自己的電腦執行（家用/公司網路的IP，104不會擋）。**Mac、Windows 都可以**，
設定一次之後，電腦會用內建的排程工具（Mac 是 launchd，Windows 是「工作排程器」）
**每小時自動幫你跑一次**，不需要打開任何程式。下面步驟大部分 Mac / Windows 共通，
只有「打開終端機」跟最後「安裝排程」那步不一樣，會分開說明。

### 6-1　準備專案資料夾

把整個專案資料夾放到你的電腦上：
- Mac 建議放在 `~/Documents/104-job-tracker`
- Windows 建議放在 `C:\Users\你的帳號\Documents\104-job-tracker`

資料夾內容要跟這個 GitHub repo 一致（可以直接下載我準備好的版本，或用
`git clone https://github.com/LU910324/104-job-tracker.git` 抓下來）。

### 6-2　安裝 Node.js、開終端機、安裝套件

**Mac：**

打開「終端機 Terminal」（Spotlight 搜尋「terminal」），執行：

```bash
cd ~/Documents/104-job-tracker
npm install
npx playwright install chromium
```

如果看到 `command not found: npm`，代表電腦還沒裝 Node.js：先到
https://nodejs.org 下載 LTS 版本、安裝完後**關掉終端機重開一個新的**，
再重新執行上面的指令。

**Windows：**

先到 https://nodejs.org 下載 LTS 版本（`.msi` 安裝檔），
一路「Next」裝完（保持預設選項就好，會自動把 npm 加進系統 PATH）。

安裝完打開「命令提示字元」或「PowerShell」（開始選單搜尋 `cmd` 或
`PowerShell`），執行：

```bat
cd C:\Users\你的帳號\Documents\104-job-tracker
npm install
npx playwright install chromium
```

如果打開的視窗是裝 Node.js **之前**就開著的，一樣要關掉重開一個新的，
才會認得剛裝好的 npm。

第一次執行 `npx playwright install chromium` 會下載瀏覽器程式，可能要等一兩分鐘。

### 6-3　建立一組 GitHub Personal Access Token（讓本機腳本可以把資料寫回GitHub）

因為排程現在跑在你自己電腦上，執行完之後要有辦法把結果（`data/jobs.json`）
寫回 GitHub，這樣你的追蹤網站才看得到最新資料。做法是用一組只有這個 repo
權限的 Token：

1. GitHub 右上角頭像 → **Settings → Developer settings → Personal access tokens
   → Fine-grained tokens → Generate new token**。
2. Repository access 選「Only select repositories」，選 `104-job-tracker`。
3. Permissions 裡把 **Contents** 設成 **Read and write**。
4. 產生後複製 Token（只會顯示一次，先存好）。

> 這組 Token 只會存在你自己的電腦裡（下一步的 `secrets.local.json`），
> 不會被提交到 GitHub，也不會被我看到——這一步請你自己操作、自己貼上。

### 6-4　建立本機專用的設定檔 `secrets.local.json`

在專案資料夾裡，把 `secrets.local.example.json` 複製一份改名叫
`secrets.local.json`，然後打開它，把值換成你自己的：

```json
{
  "discordWebhookUrl": "你的 Discord Webhook 網址",
  "githubToken": "你剛剛產生的 GitHub Token",
  "githubRepo": "LU910324/104-job-tracker",
  "anthropicApiKey": ""
}
```

前三個是必填。`anthropicApiKey` 是**選填**的，只有想開啟「AI 職缺評分」功能
（步驟七）才需要填，留空或整行刪掉都沒關係，其他功能不受影響。

這個檔案已經被列在 `.gitignore` 裡，不會不小心被提交上去。

### 6-5　手動測試一次

還在 Terminal（Windows 是命令提示字元/PowerShell）裡，執行：

```bash
npm run check
```

第一次執行會比較久（要開瀏覽器、還要下載一次職缺資料）。跑完之後：

- 看終端機輸出：有沒有「抓到 N 筆」、有沒有「已透過 GitHub API 把 data/jobs.json
  更新到倉庫」。
- 打開你的追蹤網站，看資料是不是真的更新了。
- 第一次執行 Discord 不會收到通知（除非 `notifyOnFirstRun` 設成 `true`），
  這是正常的，是在建立基準資料。

如果「抓到 0 筆」或看到「正在執行安全驗證」之類的字樣，通常是網路不穩或
104 剛好又調整了防護規則，可以稍等一下重跑一次看看。

### 6-6　安裝排程，讓它以後自動每小時執行

確認 6-5 測試沒問題之後：

**Mac：**

在 Terminal 裡執行：

```bash
bash launchd/install.sh
```

這會把排程設定檔安裝到你 Mac 的「登入項目」系統（launchd），
之後每小時的第 5 分會自動幫你檢查一次，**電腦只要有開機、有連網就會執行**
（螢幕鎖住、闔上筆電但沒睡眠都沒關係；如果電腦睡眠或關機，那次排程會跳過，
下次開機後的整點再繼續）。

之後想確認排程還活著、或者想看執行紀錄：

```bash
launchctl list | grep 104-job-tracker   # 有出現代表排程正常註冊
tail -f logs/check.log                  # 即時看執行結果
```

如果之後想要暫停或移除，`launchd/install.sh` 執行完的提示訊息裡有寫怎麼做。

**Windows：**

在專案資料夾裡，直接**滑鼠雙擊** `windows\install-task.bat`
（或在命令提示字元裡執行 `windows\install-task.bat`）。

這會把排程註冊到 Windows 內建的「工作排程器」(Task Scheduler)，
之後每小時的第 5 分會自動幫你檢查一次，**電腦只要有開機、有登入、有連網就會執行**
（螢幕鎖住沒關係；如果電腦睡眠或關機，那次排程會跳過，下次開機後的整點再繼續）。

之後想確認排程還活著、或者想看執行紀錄：

- 打開「工作排程器」應用程式，左側「工作排程器程式庫」找 `104-job-tracker`，
  或在命令提示字元打 `schtasks /query /tn "104-job-tracker"`
- 用記事本打開 `logs\check.log` 看實際執行結果

如果之後想要移除，滑鼠雙擊 `windows\uninstall-task.bat` 即可。

---

## 步驟七：設定 AI 職缺評分（選填，不設定也完全沒問題）

這個功能會在每次抓到「全新」職缺時，把職缺內容送給 AI（Anthropic 的 Claude），
請它依照你的背景和條件，幫這筆職缺打 1-5 分適合度分數、寫一句簡短理由，
並且順便判斷是不是疑似詐騙／幽靈職缺，一起顯示在 Discord 通知和追蹤網站上。

**完全選填**：不想用的話，這一步整段跳過即可，`profile.local.json` 不建立、
`secrets.local.json` 裡 `anthropicApiKey` 留空，程式會自動偵測到沒開這個功能，
其他所有功能（抓職缺、發通知、追蹤網站）都照舊正常運作。

### 7-1　建立本機專用的個人條件設定檔 `profile.local.json`

在專案資料夾裡，把 `profile.local.example.json` 複製一份改名叫
`profile.local.json`，然後打開它，填入你自己的背景和條件：

```json
{
  "skills": "平面設計、視覺設計、品牌識別、包裝設計、網頁視覺設計",
  "experience": "口口廣告有限公司 平面設計師（2025.03–2025.10）；醫淬思股份有限公司 品牌／視覺設計（2025.11–2026.03）",
  "targetRoles": "平面設計、視覺設計、專案經理",
  "minSalary": 38000,
  "locationPreference": "桃園優先，其次台北、新北",
  "dealbreakers": "不接受需要輪班的工作",
  "anthropicModel": "claude-haiku-4-5-20251001"
}
```

- **skills**：你會的技能、專長，用逗號或頓號隔開即可，不用寫得很正式。
- **experience**：過去工作經歷簡述，讓 AI 判斷職缺跟你經歷的相關程度。
- **targetRoles**：你想找的職稱／方向，跟 `config.json` 的 `keywords` 可以不一樣
  （`keywords` 是拿去 104 搜尋用的字，`targetRoles` 是講給 AI 聽你真正想要什麼）。
- **minSalary**：可接受的最低月薪（數字，單位新台幣），職缺明顯低於這個數字，
  AI 會在評分時扣分。
- **locationPreference**：地點偏好，可以直接用中文描述優先順序（例如「A優先，其次B」）。
- **dealbreakers**：絕對不考慮的條件（例如需要輪班、需要業績獎金制、需要出差等），
  用一句話描述就好，AI 遇到符合這些條件的職缺會直接大扣分。
- **anthropicModel**：呼叫哪個 AI 模型，預設 `claude-haiku-4-5-20251001`
  （速度快、成本最低，適合這種大量小任務），不熟悉的話不用改。

這個檔案內容只有你自己看得到，已經被列在 `.gitignore` 裡，**不會被提交到 GitHub**。

### 7-2　取得 Anthropic API Key

1. 到 https://console.anthropic.com 註冊/登入帳號。
2. 左側選單找到 **API Keys**，按「Create Key」，複製產生的 Key
   （長得像 `sk-ant-api03-...`，只會完整顯示一次，先存好）。
3. 這組 Key 需要你自己在 Anthropic 帳號裡儲值/綁定付款方式才能實際呼叫 API——
   跟 Claude.ai 網頁版或 App 的訂閱是**分開計費**的兩件事，訂閱 Claude Pro
   不代表這組 API Key 有額度。
4. 費用非常低：用預設的 `claude-haiku-4-5-20251001` 模型，每筆職缺評分大約
   台幣不到一毛錢（只會對「新職缺」評分一次，不會每次執行都重複算舊職缺），
   一般使用量一個月大概幾塊到十幾塊台幣的等級，可以到 console 的 Usage 頁面
   自己確認實際花費。

> 這組 Key 我一樣不會幫你輸入，你自己複製貼到設定檔即可（見下一步）。

### 7-3　把 Key 填進 `secrets.local.json`

打開步驟 6-4 建立好的 `secrets.local.json`，把 `anthropicApiKey` 的值換成
你剛剛複製的 Key：

```json
{
  "discordWebhookUrl": "...",
  "githubToken": "...",
  "githubRepo": "LU910324/104-job-tracker",
  "anthropicApiKey": "sk-ant-api03-你的Key"
}
```

存檔之後，下一次 `npm run check`（不管是手動執行還是排程自動執行）就會
自動幫新出現的職缺打分數，不需要重開機或重新安裝排程。

---

## 網站上直接編輯設定（進階，非必要）

追蹤網站本身是靜態網頁，沒辦法自己寫檔案，所以「在網站上新增關鍵字/公司」
需要一組有這個 repo 寫入權限的 GitHub Token，讓網站直接呼叫 GitHub API 幫你存檔：

1. GitHub 右上角頭像 → **Settings → Developer settings → Personal access tokens
   → Fine-grained tokens → Generate new token**。
2. Repository access 選「Only select repositories」，選你這個 repo。
3. Permissions 裡把 **Contents** 設成 **Read and write**。
4. 產生後複製 Token（只會顯示一次）。
5. 到追蹤網站下方「⚙️ 設定」，填入 `owner/repo`（例如 `LU910324/104-job-tracker`）
   和這組 Token，按「儲存」。

Token 只會存在你瀏覽器的 localStorage，不會被送到除了 GitHub 以外的任何地方。
如果不想用這個功能，直接照步驟五在 GitHub 網頁上編輯 `config.json` 就好，效果一樣。
（這組 Token 也可以直接拿去用在步驟六的 `secrets.local.json`，兩邊共用同一組沒問題。）

> 網站上原本還有一個「立即觸發檢查」按鈕，是用來手動觸發 GitHub Actions。
> 因為 GitHub Actions 現在會被 104 的 Cloudflare 擋下、抓不到真的資料，
> 這個按鈕已經沒有實際用處了——想立刻檢查一次，直接在自己電腦的 Terminal
> 執行 `npm run check` 即可（見步驟六之 6-5）。

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
會，實測證實了：104 的 Cloudflare 防護幾乎必定會擋下 GitHub Actions 的機房 IP
（公司頁面直接跳出人機驗證頁面、關鍵字搜尋回傳0筆），所以現在排程改成在自己
電腦上執行（見步驟六），GitHub Actions 只留著手動測試用。

**電腦沒開機/沒連網的時候排程會怎樣？**
那個整點的檢查會直接跳過（不會補跑），下一個整點電腦有開著再繼續正常執行。
如果你常常好幾天不開機，可以考慮把電腦設定成該時段不要睡眠，或改用一台
一直開著的電腦/Mac mini 之類的機器來跑這個排程。

**費用？**
GitHub Actions 對 Public repo 完全免費；Private repo 每月有免費額度，
一小時跑 2-3 分鐘、一天 24 次的用量遠低於免費額度。如果有另外設定步驟七的
AI 職缺評分，會額外產生 Anthropic API 的呼叫費用（見步驟七 7-2 說明），
但這功能完全選填，不設定就不會有這筆費用。

**AI 評分是必要的嗎？沒設定會怎樣？**
完全選填。沒有建立 `profile.local.json` 或沒填 `anthropicApiKey`，
程式會自動偵測到沒開啟這個功能，直接略過評分，其他功能完全不受影響。
