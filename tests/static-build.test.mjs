import assert from "node:assert/strict";
import { test, before, after } from "node:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { inflateRawSync } from "node:zlib";
import vm from "node:vm";
import path from "node:path";
import { createStaticBuild, listFiles } from "../scripts/build.mjs";
import { createStaticZip } from "../scripts/package-static.mjs";

let temporary, built, files, html;
before(async () => {
  temporary = await mkdtemp(path.join(tmpdir(), "qiyu-static-"));
  built = await createStaticBuild({
    outputDirectory: path.join(temporary, "site"),
  });
  files = await listFiles(built.outputDirectory);
  html = await readFile(path.join(built.outputDirectory, "index.html"), "utf8");
});
after(async () => {
  if (temporary) await rm(temporary, { recursive: true, force: true });
});

test("发布目录只包含可直接托管的浏览器文件", () => {
  assert.ok(files.includes("index.html"));
  assert.ok(files.includes(`${built.assetPath}/app.js`));
  assert.ok(files.includes(`${built.assetPath}/fonts/OFL.txt`));
  const allowed = new Set([
    ".html",
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
  for (const file of files) {
    assert.ok(
      file === ".nojekyll" ||
        path.basename(file) === "LICENSE" ||
        allowed.has(path.extname(file)),
      file,
    );
    assert.doesNotMatch(
      file,
      /(?:^|\/)(?:package(?:-lock)?\.json|node_modules|scripts|tests|\.git|server)(?:\/|$)/,
    );
    assert.doesNotMatch(file, /\.(?:mjs|map|ts|tsx|md)$/);
  }
});

test("首页与所有 CSS 资源引用使用可移植的相对路径", async () => {
  const references = [...html.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)]
    .map((match) => match[1])
    .filter((value) => !value.startsWith("#"));
  assert.ok(references.some((value) => value.endsWith("/app.js")));
  for (const reference of references) {
    assert.ok(reference.startsWith("assets/"), reference);
    assert.ok(files.includes(reference.split(/[?#]/)[0]), reference);
  }
  for (const css of files.filter((file) => file.endsWith(".css"))) {
    const contents = await readFile(
      path.join(built.outputDirectory, css),
      "utf8",
    );
    for (const match of contents.matchAll(
      /url\(\s*(?:"([^"]*)"|'([^']*)'|([^\s"')]+))\s*\)/g,
    )) {
      const reference = match[1] ?? match[2] ?? match[3];
      if (/^(?:data:|https?:|#)/.test(reference)) continue;
      assert.ok(!reference.startsWith("/"), `${css}: ${reference}`);
      const resource = path.posix.normalize(
        path.posix.join(path.posix.dirname(css), reference),
      );
      assert.ok(files.includes(resource), `${css}: ${resource}`);
    }
  }
});

test("发布入口为普通 JavaScript，不依赖模块 MIME 或源码导入", async () => {
  assert.doesNotMatch(html, /type=["']module["']/);
  assert.doesNotMatch(html, /\.mjs/);
  const javascript = await readFile(
    path.join(built.outputDirectory, built.assetPath, "app.js"),
    "utf8",
  );
  assert.doesNotThrow(() => new vm.Script(javascript));
  assert.doesNotMatch(javascript, /\bimport\s*(?:\(|["'])/);
});

test("独立 ZIP 根目录直接包含首页，内容与发布资源完全一致", async () => {
  const archive = path.join(temporary, "网站.zip");
  const result = await createStaticZip(built.outputDirectory, archive);
  const data = await readFile(archive);
  const extracted = new Map();
  let offset = 0;
  while (data.readUInt32LE(offset) === 0x04034b50) {
    assert.equal(data.readUInt16LE(offset + 8), 8);
    const compressedSize = data.readUInt32LE(offset + 18);
    const originalSize = data.readUInt32LE(offset + 22);
    const nameSize = data.readUInt16LE(offset + 26);
    const extraSize = data.readUInt16LE(offset + 28);
    const name = data
      .subarray(offset + 30, offset + 30 + nameSize)
      .toString("utf8");
    const start = offset + 30 + nameSize + extraSize;
    const contents = inflateRawSync(
      data.subarray(start, start + compressedSize),
    );
    assert.equal(contents.length, originalSize);
    extracted.set(name, contents);
    offset = start + compressedSize;
  }
  assert.equal([...extracted.keys()][0], "index.html");
  assert.equal(data.readUInt32LE(offset), 0x02014b50);
  assert.equal(data.readUInt32LE(data.length - 22), 0x06054b50);
  assert.equal(data.readUInt16LE(data.length - 12), result.files.length);
  assert.deepEqual([...extracted.keys()].sort(), result.files.slice().sort());
  assert.ok(!extracted.has(".nojekyll"));
  for (const [name, contents] of extracted) {
    assert.deepEqual(
      contents,
      await readFile(path.join(built.outputDirectory, name)),
    );
  }
});
