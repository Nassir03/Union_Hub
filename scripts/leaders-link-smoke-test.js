const { spawn } = require("child_process");

const chromePath = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const appUrl = process.env.APP_URL || "http://127.0.0.1:8001/";
const debugPort = Number(process.env.DEBUG_PORT || 9281);
const userDataDir = process.env.CHROME_TEST_PROFILE || "C:\\tmp\\muunganohub-leaders-link-test";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} from ${url}`);
  return response.json();
}

async function waitForDebugger() {
  for (let i = 0; i < 80; i += 1) {
    try {
      const targets = await fetchJson(`http://127.0.0.1:${debugPort}/json/list`);
      const page = targets.find((target) => target.type === "page" && target.url?.startsWith(appUrl))
        || targets.find((target) => target.type === "page");
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {
      // Browser is still starting.
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
      const message = payload.result.exceptionDetails.exception?.description
        || payload.result.exceptionDetails.text
        || "Runtime evaluation failed.";
      reject(new Error(message));
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
  for (let i = 0; i < 80; i += 1) {
    const ready = await client.send("Runtime.evaluate", {
      returnByValue: true,
      expression: "document.readyState === 'complete' && typeof window.navigateToPage === 'function'",
    });
    if (ready.result.value) return;
    await sleep(250);
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
        localStorage.setItem("muunganohub_token", "offline:leaders-test@example.com:" + Date.now());
        localStorage.setItem("muunganohub_user", JSON.stringify({
          id: 1,
          name: "Leaders Test",
          email: "leaders-test@example.com",
          profile_status: "",
          profile_photo_url: "",
          profile_photo_thumb_url: ""
        }));
      `,
    });

    const leadersUrl = new URL(appUrl);
    leadersUrl.searchParams.set("page", "leaders");
    await client.send("Page.navigate", { url: leadersUrl.href });
    await waitForApp(client);
    await sleep(900);

    const result = await client.send("Runtime.evaluate", {
      returnByValue: true,
      expression: `
        JSON.stringify((() => {
          const checks = [];
          const failures = [];
          const add = (name, ok, detail = {}) => {
            checks.push({ name, ok, detail });
            if (!ok) failures.push({ name, detail });
          };
          const leaderCards = Array.from(document.querySelectorAll("#page-leaders .leadership-card"));
          const readLinks = Array.from(document.querySelectorAll("#page-leaders .leader-read-link"));
          const imageLinks = Array.from(document.querySelectorAll("#page-leaders .leader-image-link"));
          const photos = Array.from(document.querySelectorAll("#page-leaders .leader-photo img"));
          const expectedNames = [
            "Nyerere", "Karume", "Samia", "Hussein", "Ali Hassan", "Mkapa", "Kikwete",
            "Magufuli", "Aboud", "Idrisa", "Salmin", "Aman", "Shein"
          ];
          const text = document.querySelector("#page-leaders")?.textContent || "";
          add("leaders page active", document.querySelector(".page.active")?.id === "page-leaders", {
            active: document.querySelector(".page.active")?.id || "",
          });
          add("all 13 leader cards render", leaderCards.length === 13, { count: leaderCards.length });
          add("all 13 Read more links render", readLinks.length === 13, { count: readLinks.length });
          add("all leader image links render", imageLinks.length === 13, { count: imageLinks.length });
          add("leader names visible", expectedNames.every((name) => text.includes(name)), {
            missing: expectedNames.filter((name) => !text.includes(name)),
          });
          add("Read more hrefs are real external URLs", readLinks.every((link) => /^https?:\\/\\//.test(link.href)), {
            hrefs: readLinks.map((link) => link.href),
          });
          add("Read more opens new tab safely", readLinks.every((link) => link.target === "_blank" && link.rel.includes("noreferrer")), {
            targets: readLinks.map((link) => ({ target: link.target, rel: link.rel })),
          });
          add("leader photos point to local assets", photos.every((img) => img.src.includes("/assets/") || img.src.includes("/static/assets/")), {
            srcs: photos.map((img) => img.getAttribute("src")),
          });
          return { allOk: failures.length === 0, failures, checks };
        })())
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
