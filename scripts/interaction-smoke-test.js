const { spawn } = require("child_process");

const chromePath = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const targetUrl = process.env.APP_URL || "http://127.0.0.1:8001/";
const userDataDir = process.env.CHROME_TEST_PROFILE || `${process.cwd()}\\tmp\\chrome-interaction-test`;
const debugPort = Number(process.env.CHROME_DEBUG_PORT || 9224);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} from ${url}`);
  return response.json();
}

async function waitForDebugger() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const targets = await fetchJson(`http://127.0.0.1:${debugPort}/json/list`);
      const page = targets.find((target) => target.type === "page");
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch (_) {
      await sleep(250);
    }
  }
  throw new Error("Chrome debugger did not become available.");
}

function createCdpClient(wsUrl) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(wsUrl);
    let nextId = 1;
    const pending = new Map();

    socket.addEventListener("open", () => {
      resolve({
        send(method, params = {}) {
          const id = nextId;
          nextId += 1;
          socket.send(JSON.stringify({ id, method, params }));
          return new Promise((res, rej) => pending.set(id, { res, rej }));
        },
        close() {
          socket.close();
        },
      });
    });
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (!message.id || !pending.has(message.id)) return;
      const { res, rej } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) rej(new Error(message.error.message));
      else res(message);
    });
    socket.addEventListener("error", reject);
    socket.addEventListener("close", () => {
      pending.forEach(({ rej }) => rej(new Error("Inspected target navigated or closed")));
      pending.clear();
    });
  });
}

async function main() {
  const chrome = spawn(chromePath, [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userDataDir}`,
    targetUrl,
  ], { stdio: "ignore" });

  let client;
  try {
    const wsUrl = await waitForDebugger();
    client = await createCdpClient(wsUrl);
    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("Runtime.evaluate", {
      expression: `
        localStorage.setItem("muunganohub_token", "offline:interaction-test@example.com:" + Date.now());
        localStorage.setItem("muunganohub_user", JSON.stringify({ name: "Interaction Test", email: "test@example.com" }));
        localStorage.setItem("muunganohub_session", "true");
      `,
    });
    await client.send("Page.reload", { ignoreCache: true });
    await sleep(1200);

    const result = await client.send("Runtime.evaluate", {
      awaitPromise: true,
      returnByValue: true,
      expression: `
        (async () => {
          const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
          const click = (selector) => {
            const element = document.querySelector(selector);
            if (!element) return false;
            element.click();
            return true;
          };
          for (let i = 0; i < 40; i += 1) {
            if (window.navigateToPage || document.querySelector("#platformView:not(.hidden)")) break;
            await wait(100);
          }

          window.navigateToPage("quiz");
          await wait(150);
          const quizBefore = document.querySelector("#page-quiz h1")?.textContent || "";
          const intermediateClicked = click("[data-level='intermediate']");
          await wait(150);
          const intermediateActive = document.querySelector("[data-level='intermediate']")?.classList.contains("active") || false;
          const answerClicked = click(".quiz-option[data-answer='0']");
          await wait(150);
          const feedbackShown = Boolean(document.querySelector("#quizFeedback")?.textContent?.trim());
          const nextVisible = !document.querySelector("#nextQuizButton")?.classList.contains("hidden");
          const nextClicked = click("#nextQuizButton");
          await wait(150);
          const quizAfterNext = document.querySelector("#page-quiz h1")?.textContent || "";

          window.navigateToPage("audio");
          await wait(150);
          const storyTitleBefore = document.querySelector("#storyTitle")?.textContent || "";
          const storyClicked = click("[data-story='1']");
          await wait(150);
          const storyTitleAfter = document.querySelector("#storyTitle")?.textContent || "";
          const swClicked = click("[data-audio-language='sw']");
          await wait(150);
          const swActive = document.querySelector("[data-audio-language='sw']")?.classList.contains("active") || false;
          const playClicked = click("[data-play-language]");
          await wait(150);
          const stopClicked = click("#stopStoryButton");
          await wait(150);

          return {
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
          };
        })();
      `,
    });

    const value = result.result?.result?.value || result.result?.value;
    if (!value) {
      console.log(JSON.stringify(result, null, 2));
      process.exitCode = 1;
      return;
    }
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
