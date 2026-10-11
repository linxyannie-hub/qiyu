import { mkdir, rm, readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

export const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const staticExtensions = new Set([
  ".css",
  ".js",
  ".svg",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".ico",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
  ".txt",
  ".json",
]);

export async function listFiles(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name, "en"));
  const files = [];
  for (const entry of entries) {
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) {
      files.push(
        ...(await listFiles(path.join(directory, entry.name), relative)),
      );
    } else if (entry.isFile()) {
      files.push(relative);
    } else {
      throw new Error(`发布目录不能包含特殊文件：${relative}`);
    }
  }
  return files;
}

export async function createStaticBuild({
  sourceRoot = projectRoot,
  outputDirectory = path.join(sourceRoot, "dist"),
} = {}) {
  const sourceAssets = path.join(sourceRoot, "assets");
  const html = await readFile(path.join(sourceRoot, "index.html"), "utf8");
  const assetFiles = (await listFiles(sourceAssets)).filter(
    (file) => path.extname(file) !== ".mjs",
  );
  for (const file of assetFiles) {
    if (!staticExtensions.has(path.extname(file).toLowerCase())) {
      throw new Error(`未批准的浏览器资源类型：assets/${file}`);
    }
    if (file === "app.js")
      throw new Error("assets/app.js 是发布构建保留文件名");
  }

  const bundled = await build({
    entryPoints: [path.join(sourceAssets, "app.mjs")],
    bundle: true,
    write: false,
    format: "iife",
    platform: "browser",
    target: "es2020",
    minify: true,
    legalComments: "none",
    sourcemap: false,
    logLevel: "error",
  });
  const javascript = bundled.outputFiles[0].contents;
  const hash = createHash("sha256").update(html).update(javascript);
  const assets = [];
  for (const file of assetFiles) {
    const contents = await readFile(path.join(sourceAssets, file));
    hash.update(file).update(contents);
    assets.push({ file, contents });
  }
  const release = hash.digest("hex").slice(0, 12);
  const assetPath = `assets/${release}`;
  const scripts = [
    ...html.matchAll(
      /<script\b[^>]*\bsrc=["']assets\/app\.mjs["'][^>]*>\s*<\/script>/g,
    ),
  ];
  if (scripts.length !== 1)
    throw new Error("首页必须恰好引用一次 assets/app.mjs");
  const publishedHtml = html
    .replace(scripts[0][0], '<script defer src="assets/app.js"></script>')
    .replace(/\b(src|href)=(["'])assets\//g, `$1=$2${assetPath}/`);
  const outputAssets = new Set([...assetFiles, "app.js"]);
  for (const [, reference] of publishedHtml.matchAll(
    /\b(?:src|href)=["']([^"']+)["']/g,
  )) {
    if (!reference.startsWith(`${assetPath}/`)) continue;
    if (!outputAssets.has(reference.slice(assetPath.length + 1))) {
      throw new Error(`首页引用的资源不存在：${reference}`);
    }
  }

  await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(path.join(outputDirectory, assetPath), { recursive: true });
  for (const { file, contents } of assets) {
    const target = path.join(outputDirectory, assetPath, file);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, contents);
  }
  await writeFile(path.join(outputDirectory, assetPath, "app.js"), javascript);
  await writeFile(path.join(outputDirectory, "index.html"), publishedHtml);
  await writeFile(path.join(outputDirectory, ".nojekyll"), "");
  return { outputDirectory, release, assetPath };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await createStaticBuild();
  console.log("纯静态网站已生成：dist/（HTML、CSS、普通 JS 与浏览器资源）");
}
