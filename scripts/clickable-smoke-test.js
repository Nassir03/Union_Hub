const { spawn } = require("child_process");

const chromePath = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const appUrl = process.env.APP_URL || "http://127.0.0.1:8001/";
const debugPort = Number(process.env.DEBUG_PORT || 9241);
const userDataDir = process.env.CHROME_TEST_PROFILE || "C:\\tmp\\muunganohub-clickable-test";

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
  throw new Error("Chrome DevTools endpoint did not become ready.");
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
    "--disable-dev-shm-usage",
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
        localStorage.setItem("muunganohub_token", "offline:clickable-test@example.com:" + Date.now());
        localStorage.setItem("muunganohub_user", JSON.stringify({
          id: 1,
          name: "Clickable Test",
          email: "clickable-test@example.com",
          profile_status: "",
          profile_photo_url: "",
          profile_photo_thumb_url: ""
        }));
        localStorage.setItem("muunganohub_user_progress_clickable-test@example.com", JSON.stringify({
          points: 900,
          completedLessons: [],
          completedQuizzes: ["en-beginner", "en-intermediate"],
          quizScores: [{ id: "en-beginner", score: 90 }, { id: "en-intermediate", score: 85 }],
          earnedBadges: [],
          safariVisited: ["tanganyika-independence", "zanzibar-revolution"],
          safariLearned: [],
          safariQuizzed: [],
          connectActivities: ["youth-debate-night", "union-club-meetup", "weekly-civic-challenge"],
          discussionsJoined: [],
          learningStreak: 3,
          lastLearningDate: new Date().toISOString().slice(0, 10),
          level: "Unity Builder"
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
          const checks = [];
          const failures = [];
          const add = (name, ok, detail = {}) => {
            checks.push({ name, ok, detail });
            if (!ok) failures.push({ name, detail });
          };
          window.__mhTestErrors = [];
          window.addEventListener("error", (event) => window.__mhTestErrors.push(event.message || "window error"));
          window.addEventListener("unhandledrejection", (event) => window.__mhTestErrors.push(String(event.reason?.message || event.reason || "unhandled rejection")));

          const activePage = () => document.querySelector(".page.active")?.id?.replace("page-", "") || "";
          const go = async (page) => {
            window.navigateToPage(page);
            await wait(180);
            return activePage() === page;
          };
          const click = (selector) => {
            const element = document.querySelector(selector);
            if (!element) return false;
            element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
            return true;
          };
          const localOk = async (url) => {
            const response = await fetch(url, { method: "HEAD", cache: "no-store" });
            return response.ok;
          };

          add("platform visible", !document.querySelector("#platformView")?.classList.contains("hidden"));
          for (const page of Array.from(document.querySelectorAll(".page")).map((node) => node.id.replace("page-", ""))) {
            add("navigate " + page, await go(page), { active: activePage() });
          }

          await go("dashboard");
          const progressBars = Array.from(document.querySelectorAll("#page-dashboard .progress-wrap"));
          add("dashboard progress charts render", progressBars.length >= 2 && progressBars.every((bar) => /%$/.test(bar.querySelector("i")?.style.width || "")), {
            count: progressBars.length,
          });

          await go("timeline");
          const timelineButtons = Array.from(document.querySelectorAll("#page-timeline .timeline-select"));
          add("timeline has event buttons", timelineButtons.length >= 5, { count: timelineButtons.length });
          timelineButtons[1]?.click();
          await wait(120);
          add("timeline click changes active event", document.querySelector(".timeline-node.active")?.dataset.timeline === "1");

          await go("media");
          const videoSources = Array.from(document.querySelectorAll("#page-media video source")).map((node) => node.getAttribute("src"));
          add("media videos render", videoSources.length >= 6, { videoSources });
          for (const url of videoSources.slice(0, 2)) add("video file exists " + url, await localOk(url));

          await go("quiz");
          add("quiz answer buttons clickable", click("#page-quiz [data-answer]"));
          await wait(120);
          add("quiz feedback appears", Boolean(document.querySelector("#quizFeedback")?.textContent?.trim()));

          await go("profile");
          const input = document.querySelector("#profilePhotoInput");
          add("profile photo input exists", Boolean(input));
          const pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";
          const pngBytes = Uint8Array.from(atob(pngBase64), (char) => char.charCodeAt(0));
          const transfer = new DataTransfer();
          transfer.items.add(new File([pngBytes], "avatar.png", { type: "image/png" }));
          input.files = transfer.files;
          input.dispatchEvent(new Event("change", { bubbles: true }));
          await wait(400);
          add("profile photo previews", (document.querySelector("#profilePhotoValue")?.value || "").startsWith("data:image/"));
          document.querySelector("#profileName").value = "Clickable Test Updated";
          document.querySelector("#profileStatus").value = "Testing profile save";
          document.querySelector("#profileForm").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
          await wait(250);
          const savedUser = JSON.parse(localStorage.getItem("muunganohub_user") || "{}");
          add("profile form saves", savedUser.name === "Clickable Test Updated" && savedUser.profile_status === "Testing profile save", savedUser);

          const manifestResponse = await fetch("/manifest.webmanifest", { cache: "no-store" });
          const manifest = await manifestResponse.json();
          add("PWA manifest loads", manifestResponse.ok && manifest.icons?.length >= 3, {
            icons: manifest.icons?.length || 0,
          });
          const swResponse = await fetch("/sw.js", { cache: "no-store" });
          add("service worker script loads", swResponse.ok && (await swResponse.text()).includes("CACHE_NAME"));
          add("no browser runtime errors", window.__mhTestErrors.length === 0, { errors: window.__mhTestErrors });

          return JSON.stringify({ allOk: failures.length === 0, failures, checks });
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
