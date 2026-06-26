const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const appUrl = process.env.APP_URL || "http://127.0.0.1:8001/";
const debugPort = Number(process.env.DEBUG_PORT || 9223);
const userDataDir = process.env.CHROME_TEST_PROFILE || path.join(process.cwd(), "tmp", "chrome-progress-test");

function chromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const candidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ];
  return candidates.find((item) => fs.existsSync(item));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForDebugger() {
  const url = `http://127.0.0.1:${debugPort}/json/list`;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const payload = await (await fetch(url)).json();
      const page = payload.find((target) => target.type === "page" && target.url?.startsWith(appUrl))
        || payload.find((target) => target.type === "page");
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {
      // Chrome is still starting.
    }
    await sleep(200);
  }
  throw new Error("Chrome DevTools did not start.");
}

function createCdpClient(wsUrl) {
  let id = 0;
  const pending = new Map();
  const ws = new WebSocket(wsUrl);

  ws.addEventListener("message", (event) => {
    const payload = JSON.parse(event.data);
    if (!payload.id || !pending.has(payload.id)) return;
    const { resolve, reject } = pending.get(payload.id);
    pending.delete(payload.id);
    if (payload.error) reject(new Error(payload.error.message));
    else if (payload.result?.exceptionDetails) {
      reject(new Error(payload.result.exceptionDetails.exception?.description || payload.result.exceptionDetails.text));
    } else {
      resolve(payload.result);
    }
  });

  return new Promise((resolve, reject) => {
    ws.addEventListener("open", () => {
      resolve({
        send(method, params = {}) {
          const messageId = ++id;
          ws.send(JSON.stringify({ id: messageId, method, params }));
          return new Promise((messageResolve, messageReject) => {
            pending.set(messageId, { resolve: messageResolve, reject: messageReject });
          });
        },
        close() {
          ws.close();
        },
      });
    });
    ws.addEventListener("error", () => reject(new Error("Could not connect to Chrome DevTools.")));
  });
}

async function waitForApp(client) {
  for (let i = 0; i < 100; i += 1) {
    const ready = await client.send("Runtime.evaluate", {
      returnByValue: true,
      expression: "document.readyState === 'complete' && typeof window.navigateToPage === 'function'",
    });
    if (ready.result.value) return;
    await sleep(200);
  }
  throw new Error("MuunganoHub app did not become ready.");
}

async function main() {
  const browser = chromePath();
  if (!browser) throw new Error("Chrome or Edge was not found.");
  fs.mkdirSync(userDataDir, { recursive: true });
  const chrome = spawn(browser, [
    "--headless=new",
    "--disable-gpu",
    "--disable-extensions",
    "--disable-background-networking",
    "--remote-allow-origins=*",
    "--no-first-run",
    "--no-default-browser-check",
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userDataDir}`,
    appUrl,
  ], { stdio: "ignore" });

  let client;
  try {
    const wsUrl = await waitForDebugger();
    client = await createCdpClient(wsUrl);
    await client.send("Runtime.enable");
    await client.send("Page.enable");
    await waitForApp(client);

    await client.send("Runtime.evaluate", {
      expression: `
        const progressKey = "muunganohub_user_progress_progress@test.local";
        localStorage.setItem("muunganohub_token", "offline:progress@test.local:" + Date.now());
        localStorage.setItem("muunganohub_user", JSON.stringify({
          id: "progress-test",
          email: "progress@test.local",
          name: "Progress Test",
          profile_status: "",
          profile_photo_url: "",
          profile_photo_thumb_url: ""
        }));
        localStorage.removeItem(progressKey);
        localStorage.setItem("muunganohub_language", "en");
      `,
    });
    await client.send("Page.reload", { ignoreCache: true }).catch(() => {});
    await waitForApp(client);

    const result = await client.send("Runtime.evaluate", {
      awaitPromise: true,
      returnByValue: true,
      expression: `
        (async () => {
          const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
          const progress = () => {
            const key = Object.keys(localStorage).find((item) => item === "muunganohub_user_progress_progress@test.local");
            return key ? JSON.parse(localStorage.getItem(key)) : null;
          };

          window.navigateToPage("quiz");
          await wait(250);
          const answers = quizQuestions.en.beginner.map((item) => item.answer);
          for (const answer of answers) {
            document.querySelector("[data-answer='" + answer + "']").dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
            await wait(120);
            document.querySelector("#nextQuizButton")?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
            await wait(180);
          }
          await wait(250);
          const afterQuiz = progress();

          window.navigateToPage("safari");
          await wait(250);
          for (let index = 0; index < 5; index += 1) {
            completeSafariItem(safariEvents[index][0]);
            await wait(80);
          }
          await wait(250);
          const afterSafari = progress();

          window.navigateToPage("connect");
          await wait(250);
          for (let index = 0; index < 2; index += 1) {
            const button = document.querySelector("[data-complete-connect]:not(:disabled)");
            button?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
            await wait(120);
          }
          await wait(250);
          const afterConnect = progress();

          window.navigateToPage("dashboard");
          await wait(250);
          const dashboardText = document.querySelector("#page-dashboard")?.innerText || "";
          window.navigateToPage("passport");
          await wait(250);
          const passportText = document.querySelector("#page-passport")?.innerText || "";

          return JSON.stringify({
            afterQuiz,
            afterSafari,
            afterConnect,
            dashboardHasPoints: Boolean(afterConnect && dashboardText.includes(String(afterConnect.points))),
            passportHasLevel: Boolean(afterConnect && passportText.includes(afterConnect.level)),
            passportHasQuizChampion: passportText.includes("Quiz Champion"),
            allOk:
              Boolean(afterQuiz && afterSafari && afterConnect) &&
              afterQuiz.completedQuizzes.length === 1 &&
              afterQuiz.quizScores[0].score === 100 &&
              afterQuiz.earnedBadges.includes("quiz-champion") &&
              afterSafari.safariVisited.length === 5 &&
              afterSafari.earnedBadges.includes("history-explorer") &&
              afterConnect.connectActivities.length === 2 &&
              afterConnect.earnedBadges.includes("civic-ambassador") &&
              dashboardText.includes(String(afterConnect.points)) &&
              passportText.includes(afterConnect.level),
          });
        })()
      `,
    });

    const value = JSON.parse(result.result.value || "{}");
    console.log(JSON.stringify(value, null, 2));
    if (!value.allOk) process.exitCode = 1;
  } finally {
    if (client) client.close();
    chrome.kill();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
