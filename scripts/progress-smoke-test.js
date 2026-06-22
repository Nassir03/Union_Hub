const fs = require("fs");
const { spawn } = require("child_process");

const path = require("path");

const APP_URL = "http://127.0.0.1:8001/";
const DEBUG_PORT = Number(process.env.DEBUG_PORT || 9223);
const USER_DATA_DIR = process.env.CHROME_TEST_PROFILE || path.join(process.cwd(), "tmp", "chrome-progress-test");

function chromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const candidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ];
  return candidates.find((item) => fs.existsSync(item));
}

async function waitForDebugger() {
  const url = `http://127.0.0.1:${DEBUG_PORT}/json`;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const payload = await response.json();
        const page = payload.find((target) => target.type === "page" && target.webSocketDebuggerUrl);
        if (page) return page.webSocketDebuggerUrl;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Chrome DevTools did not start.");
}

function createCdpClient(wsUrl) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(wsUrl);
    let id = 0;
    const pending = new Map();
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (!message.id || !pending.has(message.id)) return;
      const { resolve: done, reject: fail } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) fail(new Error(message.error.message));
      else done(message.result);
    });
    socket.addEventListener("open", () => {
      resolve({
        send(method, params = {}) {
          id += 1;
          socket.send(JSON.stringify({ id, method, params }));
          return new Promise((done, fail) => pending.set(id, { resolve: done, reject: fail }));
        },
        close() {
          socket.close();
        },
      });
    });
    socket.addEventListener("error", () => reject(new Error("Could not connect to Chrome DevTools.")));
  });
}

async function evaluate(client, expression) {
  const result = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || "Runtime evaluation failed.");
  return result.result.value;
}

async function main() {
  const browser = chromePath();
  if (!browser) throw new Error("Chrome or Edge was not found.");
  fs.mkdirSync(USER_DATA_DIR, { recursive: true });
  const chrome = spawn(browser, [
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${USER_DATA_DIR}`,
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    APP_URL,
  ], { stdio: ["ignore", "ignore", "pipe"] });
  let browserError = "";
  chrome.stderr.on("data", (chunk) => {
    browserError += chunk.toString();
  });

  let client;
  try {
    const wsUrl = await waitForDebugger().catch((error) => {
      throw new Error(`${error.message}${browserError ? `\n${browserError.slice(-1200)}` : ""}`);
    });
    client = await createCdpClient(wsUrl);
    await client.send("Runtime.enable");
    await client.send("Page.enable");
    await new Promise((resolve) => setTimeout(resolve, 1200));

    await evaluate(client, `(() => {
      const progressKey = "muunganohub_user_progress_progress@test.local";
      localStorage.setItem("muunganohub_token", "offline:progress@test.local");
      localStorage.setItem("muunganohub_user", JSON.stringify({ id: "progress-test", email: "progress@test.local", name: "Progress Test" }));
      localStorage.removeItem(progressKey);
      localStorage.setItem("muunganohub_language", "en");
      return true;
    })()`);
    await client.send("Page.navigate", { url: `${APP_URL}?page=quiz` });
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const progressExpression = `(() => {
      const key = Object.keys(localStorage).find((item) => item.startsWith("muunganohub_user_progress_"));
      return key ? JSON.parse(localStorage.getItem(key)) : null;
    })()`;

    const answers = await evaluate(client, `quizQuestions.en.beginner.map((item) => item.answer)`);
    for (const answer of answers) {
      await evaluate(client, `document.querySelector("[data-answer='${answer}']").click(); true`);
      await sleep(180);
      await evaluate(client, `document.querySelector("#nextQuizButton").click(); true`);
      await sleep(260);
    }
    await sleep(500);
    const afterQuiz = await evaluate(client, progressExpression);

    await evaluate(client, `navigateToPage("safari"); true`);
    await sleep(800);
    const safariButtons = await evaluate(client, `document.querySelectorAll("[data-safari-learn]").length`);
    const safariFunctionType = await evaluate(client, `typeof completeSafariItem`);
    for (let index = 0; index < 5; index += 1) {
      await evaluate(client, `completeSafariItem(safariEvents[${index}][0]); true`);
      await sleep(180);
    }
    await sleep(700);
    const afterSafari = await evaluate(client, progressExpression);

    await evaluate(client, `navigateToPage("connect"); true`);
    await sleep(800);
    const connectButtons = await evaluate(client, `document.querySelectorAll("[data-complete-connect]").length`);
    for (let index = 0; index < 2; index += 1) {
      await evaluate(client, `(() => {
        const button = document.querySelector("[data-complete-connect]:not(:disabled)");
        button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
        return true;
      })()`);
      await sleep(180);
    }
    await sleep(700);
    const afterConnect = await evaluate(client, progressExpression);

    await evaluate(client, `navigateToPage("dashboard"); true`);
    await sleep(800);
    const dashboardText = await evaluate(client, `document.querySelector("#page-dashboard").innerText`);
    await evaluate(client, `navigateToPage("passport"); true`);
    await sleep(800);
    const passportText = await evaluate(client, `document.querySelector("#page-passport").innerText`);

    const result = {
      afterQuiz,
      afterSafari,
      afterConnect,
      safariButtons,
      connectButtons,
      safariFunctionType,
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
    };

    console.log(JSON.stringify(result, null, 2));
    if (!result.allOk) process.exitCode = 1;
  } finally {
    if (client) client.close();
    chrome.kill();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
