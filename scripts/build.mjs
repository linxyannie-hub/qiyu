import { mkdir, rm, cp, readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const hash = createHash("sha256");
for (const name of (await readdir("assets")).sort()) {
  hash.update(name);
  hash.update(await readFile(`assets/${name}`));
}
const release = hash.digest("hex").slice(0, 12);
const assetPath = `assets/${release}`;
await rm("dist", { recursive: true, force: true });
await mkdir(`dist/${assetPath}`, { recursive: true });
await cp("assets", `dist/${assetPath}`, { recursive: true });
const html = (await readFile("index.html", "utf8")).replaceAll(
  '"assets/',
  `"${assetPath}/`,
);
await writeFile("dist/index.html", html);
console.log("静态发布文件已生成：dist/");
