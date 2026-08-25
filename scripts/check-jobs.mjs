// scripts/check-jobs.mjs
//
// 讀取 config.json 裡設定的關鍵字與公司清單，用真的瀏覽器（Playwright）
// 到 104 人力銀行抓目前的職缺，跟 data/jobs.json 裡記錄的舊資料比對，
// 找出「新出現」的職缺，發送 Discord 通知，並把最新結果寫回 data/jobs.json。
//
// 這支腳本設計成由 GitHub Actions 排程執行（見 .github/workflows/check-jobs.yml），
// 也可以在本機用 `node scripts/check-jobs.mjs` 手動跑一次測試。

import { chromium } from "playwright";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CONFIG_PATH = path.join(ROOT, "config.json");
const JOBS_PATH = path.join(ROOT, "data", "jobs.json");
const SECRETS_PATH = path.join(ROOT, "secrets.local.json");

// 如果在自己電腦上執行（而不是 GitHub Actions），會讀取這個本機專用的
// secrets.local.json 檔案來取得 Discord Webhook 網址。這個檔案已經被加進
// .gitignore，不會被提交到 GitHub，內容只留在你自己的電腦上。
// GitHub Actions 執行時是用 Secrets 設定環境變數，不會用到這個檔案，
// 所以已經有環境變數的話，這裡不會覆蓋它。
async function loadLocalSecretsIntoEnv() {
  const secrets = await loadJson(SECRETS_PATH, null);
  if (!secrets) return;
  if (!process.env.DISCORD_WEBHOOK_URL && secrets.discordWebhookUrl) {
    process.env.DISCORD_WEBHOOK_URL = secrets.discordWebhookUrl;
  }
  if (!process.env.GITHUB_TOKEN && secrets.githubToken) {
    process.env.GITHUB_TOKEN = secrets.githubToken;
  }
  if (!process.env.GITHUB_REPO && secrets.githubRepo) {
    process.env.GITHUB_REPO = secrets.githubRepo;
  }
}

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadJson(filePath, fallback) {
  try {
    const text = await readFile(filePath, "utf8");
    return JSON.parse(text);
  } catch (err) {
    if (err.code === "ENOENT") return fallback;
    throw err;
  }
}

function jobIdFromHref(href) {
  const match = href.match(/\/job\/([^/?]+)/);
  return match ? match[1] : null;
}

// 在頁面內執行的抓取邏輯（Playwright evaluate 進到瀏覽器 DOM 裡跑）。
// 104 的職缺搜尋頁跟公司頁用的是同一套卡片結構，所以關鍵字搜尋跟
// 公司頁面可以共用這個 function。
function extractJobsFromPage() {
  const results = [];
  const seen = new Set();
  const anchors = Array.from(document.querySelectorAll("a.info-job__text"));

  for (const a of anchors) {
    const href = a.getAttribute("href") || "";
    const match = href.match(/\/job\/([^/?]+)/);
    if (!match) continue;
    const id = match[1];
    if (seen.has(id)) continue;
    seen.add(id);

    const card = a.closest(".info-container");
    if (!card) continue;

    const companyEl = card.querySelector(".info-company__text");
    const tagEls = Array.from(card.querySelectorAll(".info-tags__text")).map((el) =>
      el.textContent.trim()
    );
    const row = a.closest(".row");
    const dateEl = row ? row.querySelector(".date") : null;

    results.push({
      id,
      title: a.textContent.trim(),
      url: `https://www.104.com.tw/job/${id}`,
      company: companyEl ? companyEl.textContent.trim() : null,
      companyUrl: companyEl ? (companyEl.getAttribute("href") || "").split("?")[0] : null,
      location: tagEls[0] || null,
      experience: tagEls[1] || null,
      education: tagEls[2] || null,
      salary: tagEls[tagEls.length - 1] || null,
      date: dateEl ? dateEl.textContent.trim() : null,
    });
  }

  return results;
}

async function scrapeUrl(page, url, { retries = 1 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      // 職缺卡片是前端渲染出來的，等它出現（或確定真的沒有結果）再抓
      await page
        .waitForSelector(".info-container, .info-noresult, .noResult", { timeout: 15000 })
        .catch(() => {});
      await sleep(800 + Math.random() * 700);
      const jobs = await page.evaluate(extractJobsFromPage);
      if (jobs.length === 0) {
        const debugInfo = await page.evaluate(() => ({
          title: document.title,
          bodySnippet: document.body ? document.body.innerText.slice(0, 300) : "(no body)",
        }));
        console.log(`  [除錯] 0筆結果，頁面標題：${debugInfo.title}`);
        console.log(`  [除錯] 頁面內容片段：${debugInfo.bodySnippet.replace(/\n/g, " ")}`);
      }
      return jobs;
    } catch (err) {
      console.error(`  抓取失敗 (第 ${attempt + 1} 次): ${url}\n  ${err.message}`);
      if (attempt === retries) return [];
      await sleep(2000);
    }
  }
  return [];
}

async function sendDiscordNotification(webhookUrl, jobs) {
  // Discord 一則訊息最多 10 個 embed，超過就分批送
  const chunkSize = 10;
  for (let i = 0; i < jobs.length; i += chunkSize) {
    const chunk = jobs.slice(i, i + chunkSize);
    const embeds = chunk.map((job) => ({
      title: job.title,
      url: job.url,
      description: job.company || "",
      color: 0xff6b00,
      fields: [
        { name: "地點", value: job.location || "未提供", inline: true },
        { name: "待遇", value: job.salary || "未提供", inline: true },
        { name: "經驗", value: job.experience || "未提供", inline: true },
      ].filter((f) => f.value),
      footer: job.matchedSources?.length
        ? { text: `符合條件：${job.matchedSources.join("、")}` }
        : undefined,
    }));

    const body = {
      username: "104 職缺追蹤",
      content: i === 0 ? `🔔 發現 ${jobs.length} 筆新職缺！` : undefined,
      embeds,
    };

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Discord webhook 回傳 ${res.status}: ${text}`);
    }
    await sleep(1200); // 避免觸發 Discord rate limit
  }
}

// 在自己電腦上執行時，把最新的 data/jobs.json 直接透過 GitHub API 寫回
// GitHub 倉庫，這樣追蹤網站（GitHub Pages）才看得到新資料。
// 這個函式只有在有設定 GITHUB_TOKEN + GITHUB_REPO 時才會執行（也就是
// 本機 secrets.local.json 裡有填的時候）；在 GitHub Actions 上執行時
// 這兩個環境變數不會被設定，資料改用 workflow 裡的 git commit/push 處理，
// 不會重複動作。
async function pushJobsJsonToGithub(jobsJsonText) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO; // 格式："owner/repo"
  if (!token || !repo) return;

  const apiUrl = `https://api.github.com/repos/${repo}/contents/data/jobs.json`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
  };

  let sha;
  try {
    const getRes = await fetch(apiUrl, { headers });
    if (getRes.ok) {
      const info = await getRes.json();
      sha = info.sha;
    } else if (getRes.status !== 404) {
      const text = await getRes.text().catch(() => "");
      throw new Error(`讀取現有檔案失敗 ${getRes.status}: ${text}`);
    }
  } catch (err) {
    console.error("查詢 GitHub 上 data/jobs.json 目前版本失敗：", err.message);
    return;
  }

  const body = {
    message: `更新職缺資料（本機排程）`,
    content: Buffer.from(jobsJsonText, "utf8").toString("base64"),
    branch: "main",
  };
  if (sha) body.sha = sha;

  try {
    const putRes = await fetch(apiUrl, {
      method: "PUT",
      headers,
      body: JSON.stringify(body),
    });
    if (!putRes.ok) {
      const text = await putRes.text().catch(() => "");
      throw new Error(`寫入失敗 ${putRes.status}: ${text}`);
    }
    console.log("已透過 GitHub API 把 data/jobs.json 更新到倉庫。");
  } catch (err) {
    console.error("推送 data/jobs.json 到 GitHub 失敗：", err.message);
  }
}

async function main() {
  await loadLocalSecretsIntoEnv();
  const config = await loadJson(CONFIG_PATH, { keywords: [], companies: [] });
  const existing = await loadJson(JOBS_PATH, { lastUpdated: null, jobs: [] });

  const existingMap = new Map(existing.jobs.map((j) => [j.id, j]));
  const isFirstRun = existingMap.size === 0;
  const notifyOnFirstRun = config.notifyOnFirstRun === true;

  const browser = await chromium.launch({
    args: ["--disable-blink-features=AutomationControlled"],
  });
  const context = await browser.newContext({
    userAgent: USER_AGENT,
    locale: "zh-TW",
    viewport: { width: 1366, height: 900 },
  });
  const page = await context.newPage();

  // key: jobId -> { ...jobFields, matchedSources: Set }
  const currentMap = new Map();

  function mergeInto(list, sourceLabel) {
    for (const job of list) {
      if (currentMap.has(job.id)) {
        currentMap.get(job.id).matchedSources.add(sourceLabel);
      } else {
        currentMap.set(job.id, { ...job, matchedSources: new Set([sourceLabel]) });
      }
    }
  }

  for (const keyword of config.keywords || []) {
    console.log(`搜尋關鍵字：${keyword}`);
    const url = `https://www.104.com.tw/jobs/search/?keyword=${encodeURIComponent(
      keyword
    )}&order=16&asc=0&page=1`;
    const jobs = await scrapeUrl(page, url);
    console.log(`  抓到 ${jobs.length} 筆`);
    mergeInto(jobs, `關鍵字:${keyword}`);
  }

  for (const company of config.companies || []) {
    if (!company.id) continue;
    console.log(`檢查公司：${company.name || company.id}`);
    const url = `https://www.104.com.tw/company/${company.id}`;
    const jobs = await scrapeUrl(page, url);
    console.log(`  抓到 ${jobs.length} 筆`);
    mergeInto(jobs, `公司:${company.name || company.id}`);
  }

  await browser.close();

  const now = new Date().toISOString();
  const newJobsToNotify = [];
  const finalJobs = [];

  for (const [id, job] of currentMap.entries()) {
    const matchedSources = Array.from(job.matchedSources);
    const prev = existingMap.get(id);

    if (prev) {
      finalJobs.push({
        ...prev,
        title: job.title,
        company: job.company,
        companyUrl: job.companyUrl,
        location: job.location,
        experience: job.experience,
        education: job.education,
        salary: job.salary,
        date: job.date,
        matchedSources: Array.from(new Set([...(prev.matchedSources || []), ...matchedSources])),
        lastSeen: now,
        isActive: true,
      });
      existingMap.delete(id);
    } else {
      const shouldNotify = !isFirstRun || notifyOnFirstRun;
      const record = {
        id,
        title: job.title,
        url: job.url,
        company: job.company,
        companyUrl: job.companyUrl,
        location: job.location,
        experience: job.experience,
        education: job.education,
        salary: job.salary,
        date: job.date,
        matchedSources,
        status: "未讀",
        firstSeen: now,
        lastSeen: now,
        isActive: true,
        notified: shouldNotify,
      };
      finalJobs.push(record);
      if (shouldNotify) newJobsToNotify.push(record);
    }
  }

  // 這次沒抓到、但之前記錄過的職缺：保留歷史紀錄，只標記為非目前可見
  for (const [, job] of existingMap.entries()) {
    finalJobs.push({ ...job, isActive: false });
  }

  finalJobs.sort((a, b) => new Date(b.firstSeen) - new Date(a.firstSeen));

  let jobsJsonText = JSON.stringify({ lastUpdated: now, jobs: finalJobs }, null, 2) + "\n";
  await writeFile(JOBS_PATH, jobsJsonText, "utf8");

  console.log(`本次共 ${currentMap.size} 筆目前可見職缺，其中新職缺 ${newJobsToNotify.length} 筆。`);

  let notifySucceeded = false;
  if (newJobsToNotify.length > 0) {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) {
      console.warn("尚未設定 DISCORD_WEBHOOK_URL，略過發送通知（本次新職缺仍會寫入 jobs.json）。");
    } else {
      try {
        await sendDiscordNotification(webhookUrl, newJobsToNotify);
        console.log("Discord 通知已送出。");
        notifySucceeded = true;
      } catch (err) {
        console.error("發送 Discord 通知失敗：", err.message);
      }
    }
  } else if (isFirstRun) {
    console.log("第一次執行：已建立基準資料，之後才會開始通知新職缺。");
  }

  // 依實際發送結果回填 notified 欄位，並重新寫檔
  if (newJobsToNotify.length > 0) {
    const notifiedIds = new Set(newJobsToNotify.map((j) => j.id));
    for (const job of finalJobs) {
      if (notifiedIds.has(job.id)) job.notified = notifySucceeded;
    }
    jobsJsonText = JSON.stringify({ lastUpdated: now, jobs: finalJobs }, null, 2) + "\n";
    await writeFile(JOBS_PATH, jobsJsonText, "utf8");
  }

  // 本機執行時（有設定 GITHUB_TOKEN/GITHUB_REPO）把最新資料同步回 GitHub，
  // 讓追蹤網站看得到；GitHub Actions 上執行則交給 workflow 的 git push 處理。
  await pushJobsJsonToGithub(jobsJsonText);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
