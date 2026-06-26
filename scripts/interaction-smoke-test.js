const { spawn } = require("child_process");

const chromePath = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const appUrl = process.env.APP_URL || "http://127.0.0.1:8001/";
const userDataDir = process.env.CHROME_TEST_PROFILE || `${process.cwd()}\\tmp\\chrome-interaction-test`;
const debugPort = Number(process.env.CHROME_DEBUG_PORT || process.env.DEBUG_PORT || 9224);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} from ${url}`);
  return response.json();
}

async function waitForDebugger() {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    try {
      const targets = await fetchJson(`http://127.0.0.1:${debugPort}/json/list`);
      const page = targets.find((target) => target.type === "page" && target.url?.startsWith(appUrl))
        || targets.find((target) => target.type === "page");
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {
      // Chrome is still starting.
    }
    await sleep(250);
  }
  throw new Error("Chrome debugger did not become available.");
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
  const chrome = spawn(chromePath, [
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
    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await waitForApp(client);
    await client.send("Runtime.evaluate", {
      expression: `
        localStorage.setItem("muunganohub_token", "offline:interaction-test@example.com:" + Date.now());
        localStorage.setItem("muunganohub_user", JSON.stringify({
          id: 1,
          name: "Interaction Test",
          email: "interaction-test@example.com",
          profile_status: "",
          profile_photo_url: "",
          profile_photo_thumb_url: ""
        }));
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
          const click = (selector) => {
            const element = document.querySelector(selector);
            if (!element) return false;
            element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
            return true;
          };

          window.navigateToPage("quiz");
          await wait(180);
          const quizBefore = document.querySelector("#page-quiz h1")?.textContent || "";
          const intermediateClicked = click("[data-level='intermediate']");
          await wait(160);
          const intermediateActive = document.querySelector("[data-level='intermediate']")?.classList.contains("active") || false;
          const answerClicked = click(".quiz-option[data-answer='0']");
          await wait(160);
          const feedbackShown = Boolean(document.querySelector("#quizFeedback")?.textContent?.trim());
          const nextVisible = !document.querySelector("#nextQuizButton")?.classList.contains("hidden");
          const nextClicked = click("#nextQuizButton");
          await wait(160);
          const quizAfterNext = document.querySelector("#page-quiz h1")?.textContent || "";

          window.navigateToPage("audio");
          await wait(180);
          const storyTitleBefore = document.querySelector("#storyTitle")?.textContent || "";
          const storyClicked = click("[data-story='1']");
          await wait(160);
          const storyTitleAfter = document.querySelector("#storyTitle")?.textContent || "";
          const swClicked = click("[data-audio-language='sw']");
          await wait(160);
          const swActive = document.querySelector("[data-audio-language='sw']")?.classList.contains("active") || false;
          const playClicked = click("[data-play-language]");
          await wait(160);
          const stopClicked = click("#stopStoryButton");
          await wait(160);

          return JSON.stringify({
            quizBefore,
            intermediateClicked,
            intermediateActive,
            answerClicked,
            feedbackShown,
            nextVisible,
            nextClicked,
            quizAfterNext,
            storyTitleBefore,
            storyClicked,
            storyTitleAfter,
            swClicked,
            swActive,
            playClicked,
            stopClicked,
            allOk: intermediateClicked
              && intermediateActive
              && answerClicked
              && feedbackShown
              && nextVisible
              && nextClicked
              && quizBefore !== quizAfterNext
              && storyClicked
              && storyTitleBefore !== storyTitleAfter
              && swClicked
              && swActive
              && playClicked
              && stopClicked,
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
