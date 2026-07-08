#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const ignoredDirs = new Set([
  ".git",
  "node_modules",
  "dist",
  "out",
  "release",
  ".next",
  ".turbo",
  "coverage",
]);
const scannedExts = new Set([".js", ".mjs", ".cjs", ".ts", ".tsx", ".json", ".md"]);
const envRefPattern =
  /(?:process\.env\.|process\.env\[['"`]|import\.meta\.env\.)([A-Z][A-Z0-9_]*)(?:['"`\]])?/g;
const secretPatterns = [
  { name: "openai_api_key", pattern: /sk-[A-Za-z0-9_-]{20,}/g },
  { name: "github_token", pattern: /gh[pousr]_[A-Za-z0-9_]{20,}/g },
  { name: "stripe_secret", pattern: /sk_(?:live|test)_[A-Za-z0-9]{20,}/g },
  { name: "generic_secret_assignment", pattern: /\b[A-Z0-9_]*(?:TOKEN|SECRET|API_KEY)\s*[:=]\s*["'][^"'\s]{16,}["']/g },
];
const runtimeProvidedEnv = new Set(["ELECTRON_RENDERER_URL"]);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
      continue;
    }
    if (!entry.isFile()) continue;
    if (entry.name.endsWith(".log")) continue;
    if (!scannedExts.has(path.extname(entry.name))) continue;
    files.push(fullPath);
  }
  return files;
}

function parseEnvFile(filePath, { includeValues = false } = {}) {
  if (!fs.existsSync(filePath)) return new Map();
  const result = new Map();
  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    if (/^[A-Z][A-Z0-9_]*$/.test(key)) {
      result.set(key, includeValues ? value : true);
    }
  }
  return result;
}

function looksPlaceholder(value) {
  return (
    value === "" ||
    /^your_.+_here$/i.test(value) ||
    /^(changeme|placeholder|example|todo)$/i.test(value)
  );
}

function gitignoreContainsEnv() {
  const filePath = path.join(root, ".gitignore");
  if (!fs.existsSync(filePath)) return false;
  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .some((line) => line === ".env" || line === ".env.local" || line === ".env*");
}

function redactLine(line) {
  return line.replace(/[A-Za-z0-9_./+=:-]{8,}/g, (value) =>
    value.length <= 12 ? "[redacted]" : `${value.slice(0, 4)}...[redacted]`,
  );
}

const files = walk(root);
const envRefs = new Map();
const leakFindings = [];

for (const filePath of files) {
  const rel = path.relative(root, filePath);
  if (rel.startsWith(`project-audits${path.sep}`)) continue;
  const content = fs.readFileSync(filePath, "utf8");

  envRefPattern.lastIndex = 0;
  for (const match of content.matchAll(envRefPattern)) {
    const key = match[1];
    if (!key) continue;
    if (!envRefs.has(key)) envRefs.set(key, new Set());
    envRefs.get(key).add(rel);
  }

  for (const check of secretPatterns) {
    check.pattern.lastIndex = 0;
    const matches = content.match(check.pattern);
    if (!matches) continue;
    const lines = content.split(/\r?\n/);
    lines.forEach((line, index) => {
      check.pattern.lastIndex = 0;
      if (check.pattern.test(line)) {
        const isExamplePlaceholder =
          rel === ".env.example" && /=$/.test(line.trim());
        if (!isExamplePlaceholder) {
          leakFindings.push({
            file: rel,
            line: index + 1,
            type: check.name,
            preview: redactLine(line.trim()),
          });
        }
      }
    });
  }
}

const exampleEnv = parseEnvFile(path.join(root, ".env.example"), { includeValues: true });
const localEnv = parseEnvFile(path.join(root, ".env"));
const required = new Set([...envRefs.keys(), ...exampleEnv.keys()]);
const missingFromExample = [...envRefs.keys()]
  .filter((key) => !runtimeProvidedEnv.has(key) && !exampleEnv.has(key))
  .sort();
const missingLocal = [...required]
  .filter((key) => {
    if (runtimeProvidedEnv.has(key)) return false;
    const defaultValue = exampleEnv.get(key);
    return !localEnv.has(key) && looksPlaceholder(String(defaultValue ?? ""));
  })
  .sort();

console.log("V environment audit");
console.log("===================");
console.log(`Scanned files: ${files.length}`);
console.log(`Environment references: ${envRefs.size}`);
console.log(`.env ignored by git: ${gitignoreContainsEnv() ? "yes" : "no"}`);

if (missingFromExample.length) {
  console.log("\nReferenced env vars missing from .env.example:");
  for (const key of missingFromExample) {
    const refs = [...envRefs.get(key)].slice(0, 3).join(", ");
    console.log(`- ${key} (${refs})`);
  }
} else {
  console.log("\n.env.example covers all referenced environment variables.");
}

if (missingLocal.length) {
  console.log("\nLocal .env values still needed:");
  for (const key of missingLocal) console.log(`- ${key}`);
} else {
  console.log("\nNo required local .env values are missing.");
}

if (leakFindings.length) {
  console.log("\nPotential secret leaks found:");
  for (const finding of leakFindings.slice(0, 20)) {
    console.log(`- ${finding.file}:${finding.line} ${finding.type} ${finding.preview}`);
  }
  if (leakFindings.length > 20) {
    console.log(`- ...and ${leakFindings.length - 20} more`);
  }
  process.exitCode = 1;
} else {
  console.log("\nNo obvious secret leaks found in scanned project files.");
}
