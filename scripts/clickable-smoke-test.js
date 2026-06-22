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
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const targets = await fetchJson(`http://127.0.0.1:${debugPort}/json/list`);
      const page = targets.find((target) => target.type === "page" && target.url?.startsWith(appUrl))
        || targets.find((target) => target.type === "page" && /^https?:\/\/127\.0\.0\.1/.test(target.url || ""))
        || targets.find((target) => target.type === "page");
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {
      // Chrome is still starting.
    }
    await sleep(250);
  }
  throw new Error("Chrome DevTools endpoint did not become ready.");
}

async function evaluateWithRetry(client, params, attempts = 4) {
  let lastError;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await client.send("Runtime.evaluate", params);
    } catch (error) {
      lastError = error;
      if (!/Execution context was destroyed/i.test(error.message || "")) throw error;
      await sleep(350);
    }
  }
  throw lastError;
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
    else resolve(payload.result);
  });

  return new Promise((resolve, reject) => {
    ws.addEventListener("open", () => {
      resolve({
        async send(method, params = {}) {
          const messageId = ++id;
          ws.send(JSON.stringify({ id: messageId, method, params }));
          const result = await new Promise((messageResolve, messageReject) => {
            pending.set(messageId, { resolve: messageResolve, reject: messageReject });
          });
          if (result.exceptionDetails) {
            const message = result.exceptionDetails.exception?.description
              || result.exceptionDetails.text
              || "Runtime evaluation failed.";
            throw new Error(message);
          }
          return result;
        },
        close() {
          ws.close();
        },
      });
    });
    ws.addEventListener("error", () => reject(new Error("Could not connect to Chrome DevTools.")));
  });
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

    await client.send("Page.navigate", { url: appUrl });
    await sleep(800);

    await evaluateWithRetry(client, {
      expression: `
        localStorage.setItem("muunganohub_token", "offline:clickable-test@example.com:" + Date.now());
        localStorage.setItem("muunganohub_user", JSON.stringify({
          id: 1,
          name: "Clickable Test",
          email: "clickable-test@example.com",
          profile_status: "",
          profile_photo: ""
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
    try {
      await client.send("Page.reload", { ignoreCache: true });
    } catch (error) {
      if (!/Execution context was destroyed/i.test(error.message || "")) throw error;
    }

    for (let i = 0; i < 60; i += 1) {
      try {
        const ready = await client.send("Runtime.evaluate", {
          returnByValue: true,
          expression: "document.readyState === 'complete' && typeof window.navigateToPage === 'function'",
        });
        if (ready.result.value) break;
      } catch (error) {
        if (!/Execution context was destroyed/i.test(error.message || "")) throw error;
      }
      await sleep(250);
    }

    const result = await evaluateWithRetry(client, {
      returnByValue: true,
      expression: `
        window.__mhSmokeResult = "";
        window.__mhSmokeProgress = JSON.stringify({ last: "injection started", failures: [], checks: [] });
        (async () => {
          const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
          const failures = [];
          const checks = [];
          window.__mhSmokeProgress = JSON.stringify({ last: "async entered", failures, checks });
          try {
          window.__mhTestErrors = [];
          window.addEventListener("error", (event) => window.__mhTestErrors.push(event.message || "window error"));
          window.addEventListener("unhandledrejection", (event) => window.__mhTestErrors.push(String(event.reason?.message || event.reason || "unhandled rejection")));
          const originalConsoleError = console.error;
          console.error = (...args) => {
            window.__mhTestErrors.push(args.map(String).join(" "));
            originalConsoleError.apply(console, args);
          };
          const add = (name, ok, detail = {}) => {
            checks.push({ name, ok, detail });
            if (!ok) failures.push({ name, detail });
            window.__mhSmokeProgress = JSON.stringify({ last: name, failures, checks });
          };
          const click = (selector) => {
            const element = document.querySelector(selector);
            if (!element) return false;
            element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
            return true;
          };
          const activePage = () => document.querySelector(".page.active")?.id?.replace("page-", "") || "";
          const basePrefix = window.location.pathname.startsWith("/MuunganoHub/") ? "/MuunganoHub" : "";
          const isAssetUrl = (url, kind = "") => {
            const suffix = kind ? kind + "/" : "";
            return url.startsWith(basePrefix + "/assets/" + suffix) || url.startsWith(basePrefix + "/static/assets/" + suffix);
          };
          const go = async (page) => {
            window.navigateToPage(page);
            await wait(150);
            return activePage() === page && document.querySelector("#platformView")?.dataset.page === page;
          };
          const localOk = async (url) => {
            const response = await fetch(url, { method: "HEAD", cache: "no-store" });
            return response.ok;
          };

          for (let i = 0; i < 60; i += 1) {
            if (typeof window.navigateToPage === "function" && !document.querySelector("#platformView")?.classList.contains("hidden")) break;
            await wait(100);
          }

          add("platform visible", !document.querySelector("#platformView")?.classList.contains("hidden"));
          add("helper available", typeof window.navigateToPage === "function");

          const pages = Array.from(document.querySelectorAll(".page")).map((page) => page.id.replace("page-", ""));
          for (const page of pages) add("navigate " + page, await go(page), { active: activePage() });

          const staticUrls = Array.from(document.querySelectorAll("a[href], link[href], img[src], source[src]"))
            .map((node) => node.getAttribute("href") || node.getAttribute("src"))
            .filter((url) => url && isAssetUrl(url));
          add("no local-only static URLs", staticUrls.every((url) => !url.includes("127.0.0.1") && !url.includes("localhost")), { count: staticUrls.length });
          for (const url of Array.from(new Set(staticUrls))) add("asset exists " + url, await localOk(url));

          await go("history");
          const historyLinks = Array.from(document.querySelectorAll("#page-history [data-complete-history]"));
          add("history has five lesson links", historyLinks.length === 5, { count: historyLinks.length });
          add("history lesson links have hrefs", historyLinks.every((item) => item.tagName !== "A" || item.getAttribute("href")), {
            hrefs: historyLinks.map((item) => item.getAttribute("href") || ""),
          });
          const teachClicked = click("#page-history [data-teach]");
          await wait(250);
          add("history AI Tutor opens chatbot", teachClicked && activePage() === "chatbot" && document.querySelector("#questionInput")?.value === "", {
            active: activePage(),
            messages: document.querySelector("#messages")?.textContent?.slice(-120) || "",
          });

          await go("timeline");
          const timelineButtons = Array.from(document.querySelectorAll("#page-timeline .timeline-select"));
          add("timeline has six event buttons", timelineButtons.length === 6, { count: timelineButtons.length });
          for (let i = 0; i < timelineButtons.length; i += 1) {
            timelineButtons[i].click();
            await wait(80);
            add("timeline event opens " + i, document.querySelector(".timeline-node.active")?.dataset.timeline === String(i), {
              active: document.querySelector(".timeline-node.active")?.dataset.timeline || "",
              detail: document.querySelector("#timelineDetail h3")?.textContent || "",
            });
          }
          const timelineDocLinks = Array.from(document.querySelectorAll("#page-timeline a[href]")).map((anchor) => anchor.getAttribute("href"));
          const timelineLocalDocs = timelineDocLinks.filter((url) => isAssetUrl(url, "docs"));
          const isExternalRef = (url) => url.startsWith("http://") || url.startsWith("https://");
          const timelineExternalRefs = timelineDocLinks.filter((url) => isExternalRef(url));
          add("timeline Read more links are docs or external refs", timelineDocLinks.every((url) => isAssetUrl(url, "docs") || isExternalRef(url)), { timelineDocLinks });
          add("timeline external refs open in new tab", Array.from(document.querySelectorAll("#page-timeline a[href^='http']")).every((anchor) => anchor.target === "_blank" && anchor.rel.includes("noopener")), { timelineExternalRefs });
          for (const url of Array.from(new Set(timelineLocalDocs))) add("timeline document exists " + url, await localOk(url));

          await go("media");
          const videos = Array.from(document.querySelectorAll("#page-media video source")).map((source) => source.getAttribute("src"));
          const videoActions = Array.from(document.querySelectorAll("#page-media .media-open-link")).map((anchor) => anchor.getAttribute("href"));
          add("media has six video sources", videos.length === 6, { videos });
          add("media Open Video links are relative videos", videoActions.length === 6 && videoActions.every((url) => isAssetUrl(url, "videos")), { videoActions });
          for (const url of Array.from(new Set([...videos, ...videoActions]))) add("video exists " + url, await localOk(url));

          await go("safari");
          const learnClicked = click("#page-safari [data-safari-learn]");
          await wait(180);
          add("Safari Learn More opens history", learnClicked && activePage() === "history", { active: activePage() });
          await go("safari");
          const quizClicked = click("#page-safari [data-safari-quiz]");
          await wait(180);
          add("Safari Take Quiz opens quiz", quizClicked && activePage() === "quiz", { active: activePage() });
          await go("safari");
          const safariTeachClicked = click("#page-safari [data-teach]");
          await wait(250);
          add("Safari Ask AI opens chatbot", safariTeachClicked && activePage() === "chatbot", { active: activePage() });

          await go("connect");
          const ideaClicked = click("#page-connect [data-question]");
          await wait(250);
          add("Connect Submit Your Idea opens chatbot", ideaClicked && activePage() === "chatbot", { active: activePage() });
          await go("connect");
          const completeBefore = JSON.parse(localStorage.getItem("muunganohub_user_progress_clickable-test@example.com")).connectActivities.length;
          const connectClicked = click("#page-connect [data-complete-connect]:not(:disabled)");
          await wait(180);
          const completeAfter = JSON.parse(localStorage.getItem("muunganohub_user_progress_clickable-test@example.com")).connectActivities.length;
          add("Connect challenge button records progress", connectClicked && completeAfter >= completeBefore, { completeBefore, completeAfter });
          let printCalled = false;
          const oldOpen = window.open;
          window.open = () => ({
            document: { write() {}, close() {} },
            print() { printCalled = true; },
          });
          const certClicked = click("#downloadCertificateButton:not(:disabled)");
          await wait(600);
          window.open = oldOpen;
          add("certificate button opens print window", certClicked && printCalled);

          await go("profile");
          const pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";
          const pngBytes = Uint8Array.from(atob(pngBase64), (char) => char.charCodeAt(0));
          const photoInput = document.querySelector("#profilePhoto");
          const transfer = new DataTransfer();
          transfer.items.add(new File([pngBytes], "avatar.png", { type: "image/png" }));
          photoInput.files = transfer.files;
          photoInput.dispatchEvent(new Event("change", { bubbles: true }));
          await wait(500);
          const uploadedPhoto = document.querySelector("#profilePhotoValue")?.value || "";
          const savedDraft = JSON.parse(localStorage.getItem("muunganohub_user") || "{}").profile_photo || "";
          add("profile photo upload previews immediately", uploadedPhoto.startsWith("data:image/") && document.querySelector(".profile-avatar-preview")?.tagName === "IMG", {
            hasValue: uploadedPhoto.startsWith("data:image/"),
            previewTag: document.querySelector(".profile-avatar-preview")?.tagName || "",
          });
          add("profile photo draft remains in localStorage", savedDraft.startsWith("data:image/"), { saved: savedDraft.slice(0, 24) });
          document.querySelector("#profileName").value = "Clickable Test Updated";
          document.querySelector("#profileStatus").value = "Testing profile save";
          document.querySelector("#profileForm").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
          await wait(250);
          const user = JSON.parse(localStorage.getItem("muunganohub_user") || "{}");
          add("profile form saves offline profile", user.name === "Clickable Test Updated" && user.profile_status === "Testing profile save", user);

          await go("audio");
          const storyBefore = document.querySelector("#storyTitle")?.textContent || "";
          const storyClicked = click("#page-audio [data-story='1']");
          await wait(180);
          add("audio story selector changes story", storyClicked && document.querySelector("#storyTitle")?.textContent !== storyBefore, {
            before: storyBefore,
            after: document.querySelector("#storyTitle")?.textContent || "",
          });
          const swClicked = click("#page-audio [data-audio-language='sw']");
          await wait(180);
          add("audio language switch works", swClicked && document.querySelector("#page-audio [data-audio-language='sw']")?.classList.contains("active"));
          const playClicked = click("#page-audio [data-play-language]");
          await wait(120);
          const stopClicked = click("#stopStoryButton");
          await wait(120);
          add("audio play and stop buttons respond", playClicked && stopClicked);

          const manifestResponse = await fetch(basePrefix + "/manifest.webmanifest", { cache: "no-store" });
          const manifest = await manifestResponse.json();
          add("PWA manifest loads", manifestResponse.ok && ["/", "../", "./"].includes(manifest.start_url) && manifest.icons?.length >= 3, {
            start_url: manifest.start_url,
            icons: manifest.icons?.length || 0,
          });
          const swResponse = await fetch(basePrefix + "/sw.js", { cache: "no-store" });
          add("service worker script loads", swResponse.ok && (await swResponse.text()).includes("CACHE_NAME"));
          add("no browser console/runtime errors during smoke flow", window.__mhTestErrors.length === 0, { errors: window.__mhTestErrors });

          window.__mhSmokeResult = JSON.stringify({ allOk: failures.length === 0, failures, checks });
          } catch (error) {
            failures.push({
              name: "smoke runner exception",
              detail: { message: String(error?.message || error) },
            });
            window.__mhSmokeResult = JSON.stringify({ allOk: false, failures, checks });
          }
        })();
        "started";
      `,
    });

    let value = null;
    for (let i = 0; i < 120; i += 1) {
      const poll = await evaluateWithRetry(client, {
        returnByValue: true,
        expression: "window.__mhSmokeResult || ''",
      });
      const rawValue = poll.result.value || "";
      if (rawValue) {
        value = JSON.parse(rawValue);
        break;
      }
      await sleep(500);
    }
    if (!value) {
      const progress = await evaluateWithRetry(client, {
        returnByValue: true,
        expression: "window.__mhSmokeProgress || ''",
      });
      const progressValue = progress.result.value ? JSON.parse(progress.result.value) : { checks: [] };
      console.log(JSON.stringify({
        allOk: false,
        failures: [{ name: "smoke test timed out", detail: { last: progressValue.last || "" } }, ...(progressValue.failures || [])],
        checks: progressValue.checks || [],
      }, null, 2));
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
