const { spawn } = require("child_process");

const chromePath = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const appUrl = process.env.APP_URL || "http://127.0.0.1:8001/";
const debugPort = Number(process.env.DEBUG_PORT || 9223);
const userDataDir = process.env.CHROME_TEST_PROFILE || `${process.cwd()}\\tmp\\chrome-navigation-test`;

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
        localStorage.removeItem("muunganohub_token");
        localStorage.removeItem("muunganohub_user");
        localStorage.removeItem("muunganohub_session");
      `,
    });
    await client.send("Page.reload", { ignoreCache: true }).catch(() => {});
    await waitForApp(client);

    const publicResult = await client.send("Runtime.evaluate", {
      awaitPromise: true,
      returnByValue: true,
      expression: `
        (async () => {
          const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
          for (let i = 0; i < 50; i += 1) {
            const platformVisible = !document.querySelector("#platformView")?.classList.contains("hidden");
            const authHidden = document.querySelector("#authView")?.classList.contains("hidden");
            const active = document.querySelector(".page.active")?.id;
            if (platformVisible && authHidden && active === "page-home") {
              return { ok: true, active, authHidden, platformVisible };
            }
            await wait(100);
          }
          return {
            ok: false,
            active: document.querySelector(".page.active")?.id || "",
            authHidden: document.querySelector("#authView")?.classList.contains("hidden"),
            platformVisible: !document.querySelector("#platformView")?.classList.contains("hidden"),
          };
        })()
      `,
    });

    await client.send("Runtime.evaluate", {
      expression: `
        localStorage.setItem("muunganohub_token", "offline:navigation-test@example.com:${Date.now()}");
        localStorage.setItem("muunganohub_user", JSON.stringify({
          id: 1,
          name: "Navigation Test",
          email: "navigation-test@example.com",
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
          const activePage = () => document.querySelector(".page.active")?.id?.replace("page-", "") || "";
          const pages = Array.from(document.querySelectorAll(".page")).map((page) => page.id.replace("page-", ""));
          const results = [];
          const menuResults = [];

          for (const page of pages) {
            window.navigateToPage(page);
            await wait(140);
            results.push({
              page,
              active: activePage(),
              current: document.querySelector("#platformView")?.dataset.page,
              urlPage: new URLSearchParams(location.search).get("page") || "home",
              ok: activePage() === page && document.querySelector("#platformView")?.dataset.page === page,
            });
          }

          for (const page of pages) {
            const menuButton = document.querySelector("#mainMenuButton");
            const menuPanel = document.querySelector("#mainMenuPanel");
            const target = menuPanel?.querySelector("[data-page='" + page + "']");
            if (!menuButton || !menuPanel || !target) {
              menuResults.push({ page, ok: false, reason: "missing menu control" });
              continue;
            }
            menuButton.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
            await wait(100);
            const opened = menuPanel.classList.contains("open") && menuButton.getAttribute("aria-expanded") === "true";
            target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
            await wait(100);
            const closed = !menuPanel.classList.contains("open") && menuButton.getAttribute("aria-expanded") === "false";
            menuResults.push({
              page,
              opened,
              closed,
              active: activePage(),
              ok: opened && closed && activePage() === page,
            });
          }

          return JSON.stringify({
            platformReady: !document.querySelector("#platformView")?.classList.contains("hidden"),
            helperAvailable: typeof window.navigateToPage === "function",
            pages,
            results,
            menuResults,
            allOk: results.every((item) => item.ok) && menuResults.every((item) => item.ok),
          });
        })()
      `,
    });

    const value = { publicLanding: publicResult.result.value, ...JSON.parse(result.result.value || "{}") };
    console.log(JSON.stringify(value, null, 2));
    if (!value.publicLanding.ok || !value.allOk) process.exitCode = 1;
  } finally {
    if (client) client.close();
    chrome.kill();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
