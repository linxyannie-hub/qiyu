import { mkdir, rm, cp, readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const hash = createHash("sha256");
async function fingerprint(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name, "en"));
  for (const entry of entries) {
    const file = `${directory}/${entry.name}`;
    if (entry.isDirectory()) await fingerprint(file);
    else {
      hash.update(file);
      hash.update(await readFile(file));
    }
  }
}
await fingerprint("assets");
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
