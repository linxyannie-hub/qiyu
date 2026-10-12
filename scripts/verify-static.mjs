import assert from "node:assert/strict";
import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { createStaticBuild } from "./build.mjs";

const args = process.argv.slice(2);
if (
  args.length &&
  (args.length !== 2 || args[0] !== "--directory" || !args[1])
) {
  throw new Error("用法：npm run test:static [-- --directory /纯静态网站目录]");
}
const outputDirectory = args.length
  ? path.resolve(args[1])
  : (await createStaticBuild()).outputDirectory;
const nestedPath = "/competition/qiyu/";
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};
const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(
      new URL(request.url, "http://localhost").pathname,
    );
    const relative = pathname.startsWith(nestedPath)
      ? pathname.slice(nestedPath.length)
      : pathname.slice(1);
    const absolute = path.resolve(outputDirectory, relative);
    if (
      absolute !== outputDirectory &&
      !absolute.startsWith(outputDirectory + path.sep)
    ) {
      response.writeHead(403).end();
      return;
    }
    const file = (await stat(absolute)).isDirectory()
      ? path.join(absolute, "index.html")
      : absolute;
    response.writeHead(200, {
      "Content-Type": mime[path.extname(file)] || "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
    });
    response.end(await readFile(file));
  } catch {
    response.writeHead(404).end();
  }
});
let browser;
try {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  await context.route(/^https?:\/\//, async (route) => {
    if (new URL(route.request().url()).origin === origin)
      await route.continue();
    else {
      errors.push(`不应请求外网：${route.request().url()}`);
      await route.abort();
    }
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400)
      errors.push(`${response.status()} ${response.url()}`);
  });
  const routes = [
    "home/dashboard",
    "clinic/dashboard",
    "doctor/dashboard",
    "ops/dashboard",
    "family/today/pet-1",
  ];
  let checked = 0;
  for (const prefix of [`${origin}/`, `${origin}${nestedPath}`]) {
    for (const route of routes) {
      await page.goto(`${prefix}#/${route}`);
      await page.waitForSelector("main");
      await page.evaluate(() => document.fonts.ready);
      assert.equal(
        await page.evaluate(() => document.body.dataset.workspace),
        route.split("/")[0],
      );
      assert.equal(await page.locator(".boot").count(), 0);
      assert.ok(await page.locator("main").innerText());
      assert.ok(
        await page.evaluate(() =>
          [...document.fonts].some(
            (font) =>
              /MiSans VF|Qiyu UI Sans/.test(font.family) &&
              font.status === "loaded",
          ),
        ),
      );
      assert.equal(await page.locator("script[src$='/app.js']").count(), 1);
      if (route.startsWith("clinic/")) {
        await page.locator('[data-action="new-plan"]').first().click();
        await page.waitForSelector("#dialog[open]");
        await page
          .locator('#dialog [data-action="close-dialog"]')
          .first()
          .click();
        assert.equal(await page.locator("#dialog[open]").count(), 0);
      }
      checked++;
    }
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${prefix}#/family/today/pet-1`);
    await page.waitForSelector("main");
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    await page.reload();
    await page.waitForSelector("main");
    await page.setViewportSize({ width: 1440, height: 1000 });
  }
  // The upload package can also be opened without a local server or Node.js.
  await page.goto(
    `${pathToFileURL(path.join(outputDirectory, "index.html")).href}#/family/today/pet-1`,
  );
  await page.waitForSelector("main");
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.locator(".boot").count(), 0);
  assert.ok(
    await page.evaluate(() =>
      [...document.fonts].some(
        (font) =>
          /MiSans VF|Qiyu UI Sans/.test(font.family) &&
          font.status === "loaded",
      ),
    ),
  );
  assert.deepEqual(errors, []);
  console.log(
    `纯静态网站检查通过：${checked} 个根路径/子路径页面、移动端刷新、交互与直接打开首页；页面无需外网资源。`,
  );
} finally {
  if (browser) await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
