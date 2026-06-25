const fs = require("fs");
const path = require("path");

const root = process.cwd();
const frontendDir = path.join(root, "frontend");
const scannedFiles = [
  "frontend/index.html",
  "frontend/styles.css",
  "frontend/app.js",
  "frontend/manifest.webmanifest",
  "frontend/sw.js",
];

function normalizeLocalUrl(rawUrl) {
  if (!rawUrl || rawUrl.startsWith("#")) return rawUrl;
  if (/^(?:https?:|mailto:|tel:|data:|blob:)/i.test(rawUrl)) return "";
  let clean = rawUrl.split(/[?#]/, 1)[0].replace(/^['"]|['"]$/g, "");
  if (!clean) return "";
  if (clean.startsWith("/uploads/") || clean.startsWith("/static/uploads/")) return "";
  if (clean.startsWith("/MuunganoHub/")) clean = clean.slice("/MuunganoHub".length);
  if (clean.startsWith("/static/")) clean = clean.slice("/static/".length);
  else if (clean.startsWith("static/")) clean = clean.slice("static/".length);
  else if (clean.startsWith("/")) clean = clean.slice(1);
  return clean;
}

function fileExistsForUrl(rawUrl) {
  const normalized = normalizeLocalUrl(rawUrl);
  if (!normalized || normalized.startsWith("#")) return true;
  const candidates = [
    path.join(frontendDir, normalized),
    path.join(frontendDir, normalized.replace(/^assets[\\/]/, "assets/")),
  ];
  return candidates.some((candidate) => fs.existsSync(candidate));
}

const localUrlPattern = /(?:href|src)=["']([^"']+)["']|url\(["']?([^"')]+)["']?\)|["'`]((?:\/static\/|static\/|assets\/|\/assets\/|manifest\.webmanifest|styles\.css|app\.js|quiz-bank\.js|sw\.js)[^"'`]*)["'`]/g;
const failures = [];
const checks = [];

for (const relativeFile of scannedFiles) {
  const absoluteFile = path.join(root, relativeFile);
  const text = fs.readFileSync(absoluteFile, "utf8");
  let match;
  while ((match = localUrlPattern.exec(text))) {
    const url = match[1] || match[2] || match[3] || "";
    if (!url || url.includes("${")) continue;
    if (url === "#") {
      failures.push({ file: relativeFile, url, reason: "empty hash link" });
      continue;
    }
    const normalized = normalizeLocalUrl(url);
    if (!normalized || normalized.startsWith("#")) continue;
    const ok = fileExistsForUrl(url);
    checks.push({ file: relativeFile, url, normalized, ok });
    if (!ok) failures.push({ file: relativeFile, url, normalized, reason: "missing local file" });
  }
}

const result = {
  allOk: failures.length === 0,
  checked: checks.length,
  failures,
};

console.log(JSON.stringify(result, null, 2));
if (!result.allOk) process.exit(1);
