const { spawn } = require("child_process");

const chromePath = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const appUrl = process.env.APP_URL || "http://127.0.0.1:8001/";
const debugPort = Number(process.env.DEBUG_PORT || 9286);
const userDataDir = process.env.CHROME_TEST_PROFILE || "C:\\tmp\\muunganohub-profile-photo-test";

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
      // Browser is starting.
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
        localStorage.setItem("muunganohub_token", "offline:profile-photo-test@example.com:" + Date.now());
        localStorage.setItem("muunganohub_user", JSON.stringify({
          id: 1,
          name: "Profile Photo Test",
          email: "profile-photo-test@example.com",
          profile_status: "",
          profile_photo: ""
        }));
        localStorage.setItem("muunganohub_offline_users", JSON.stringify([{
          id: 1,
          name: "Profile Photo Test",
          email: "profile-photo-test@example.com",
          password: "SmokeTest123!",
          profile_status: "",
          profile_photo: ""
        }]));
      `,
    });

    const profileUrl = new URL(appUrl);
    profileUrl.searchParams.set("page", "profile");
    await client.send("Page.navigate", { url: profileUrl.href });
    await waitForApp(client);
    await sleep(800);

    const result = await client.send("Runtime.evaluate", {
      awaitPromise: true,
      returnByValue: true,
      expression: `
        (async () => JSON.stringify(await (async () => {
          const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
          const checks = [];
          const failures = [];
          const add = (name, ok, detail = {}) => {
            checks.push({ name, ok, detail });
            if (!ok) failures.push({ name, detail });
          };
          const input = document.querySelector("#profilePhoto");
          const bigButton = document.querySelector("#profilePhotoButton");
          const chooseButton = document.querySelector("#chooseProfilePhotoButton");
          add("profile page active", document.querySelector(".page.active")?.id === "page-profile", {
            active: document.querySelector(".page.active")?.id || "",
          });
          add("photo controls exist", Boolean(input && bigButton && chooseButton));
          add("file input is hidden", Boolean(input?.hidden) && getComputedStyle(input).display === "none", {
            hidden: input?.hidden,
            display: input ? getComputedStyle(input).display : "",
          });
          add("accepts jpg png webp gif", String(input?.accept || "").includes("image/jpeg")
            && String(input?.accept || "").includes("image/png")
            && String(input?.accept || "").includes("image/webp")
            && String(input?.accept || "").includes("image/gif"), { accept: input?.accept || "" });
          let clickCount = 0;
          const oldClick = input.click.bind(input);
          input.click = () => { clickCount += 1; };
          bigButton.click();
          chooseButton.click();
          input.click = oldClick;
          add("both add photo controls open picker", clickCount === 2, { clickCount });

          const pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";
          const pngBytes = Uint8Array.from(atob(pngBase64), (char) => char.charCodeAt(0));
          const transfer = new DataTransfer();
          transfer.items.add(new File([pngBytes], "avatar.png", { type: "image/png" }));
          input.files = transfer.files;
          input.dispatchEvent(new Event("change", { bubbles: true }));
          await wait(600);
          const uploadedPhoto = document.querySelector("#profilePhotoValue")?.value || "";
          add("upload previews immediately", uploadedPhoto.startsWith("data:image/") && document.querySelector(".profile-avatar-preview")?.tagName === "IMG", {
            valuePrefix: uploadedPhoto.slice(0, 24),
            previewTag: document.querySelector(".profile-avatar-preview")?.tagName || "",
          });
          document.querySelector("#profileName").value = "Profile Photo Saved";
          document.querySelector("#profileForm").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
          await wait(450);
          const savedUser = JSON.parse(localStorage.getItem("muunganohub_user") || "{}");
          add("profile save persists photo", String(savedUser.profile_photo || "").startsWith("data:image/"), {
            savedPrefix: String(savedUser.profile_photo || "").slice(0, 24),
          });
          window.renderProfile();
          await wait(100);
          add("refresh render keeps photo", document.querySelector(".profile-avatar-preview")?.tagName === "IMG"
            && document.querySelector("#profilePhotoValue")?.value?.startsWith("data:image/"), {
            previewTag: document.querySelector(".profile-avatar-preview")?.tagName || "",
          });
          return { allOk: failures.length === 0, failures, checks };
        })()))()
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
