import { mkdir, readFile, writeFile } from "node:fs/promises";
import { deflateRawSync } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createStaticBuild, listFiles, projectRoot } from "./build.mjs";

const crcTable = Array.from({ length: 256 }, (_, value) => {
  for (let bit = 0; bit < 8; bit++) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

// Standard ZIP records keep packaging independent of system tools.
export async function createStaticZip(directory, outputFile) {
  const absoluteDirectory = path.resolve(directory);
  const absoluteOutput = path.resolve(outputFile);
  if (
    absoluteOutput === absoluteDirectory ||
    absoluteOutput.startsWith(absoluteDirectory + path.sep)
  ) {
    throw new Error(
      "请将 ZIP 输出到网站发布目录之外，保持发布目录只有静态页面资源。",
    );
  }
  const files = (await listFiles(directory)).filter(
    (file) => file !== ".nojekyll",
  );
  files.sort((a, b) =>
    a === "index.html" ? -1 : b === "index.html" ? 1 : a.localeCompare(b, "en"),
  );
  const localRecords = [];
  const centralRecords = [];
  let offset = 0;
  for (const file of files) {
    if (file.startsWith("/") || file.split("/").includes("..")) {
      throw new Error(`不能打包不安全路径：${file}`);
    }
    const name = Buffer.from(file, "utf8");
    const contents = await readFile(path.join(directory, file));
    const compressed = deflateRawSync(contents, { level: 9 });
    const checksum = crc32(contents);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(33, 12); // January 1, 1980; stable archive metadata.
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(contents.length, 22);
    local.writeUInt16LE(name.length, 26);
    localRecords.push(local, name, compressed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(33, 14);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(contents.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centralRecords.push(central, name);
    offset += local.length + name.length + compressed.length;
  }
  const centralDirectory = Buffer.concat(centralRecords);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  await mkdir(path.dirname(outputFile), { recursive: true });
  await writeFile(
    outputFile,
    Buffer.concat([...localRecords, centralDirectory, end]),
  );
  return { outputFile, files };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const args = process.argv.slice(2);
  if (
    args.length &&
    (args.length !== 2 || args[0] !== "--output" || !args[1])
  ) {
    throw new Error(
      "用法：npm run package:static -- --output /完整路径/网站.zip",
    );
  }
  const outputFile = args.length
    ? path.resolve(args[1])
    : path.resolve(projectRoot, "..", "栖愈纯前端网站.zip");
  const { outputDirectory } = await createStaticBuild();
  const result = await createStaticZip(outputDirectory, outputFile);
  console.log(`纯前端上传包已生成：${result.outputFile}`);
  console.log(
    `包含 ${result.files.length} 个静态文件；解压根目录直接为 index.html。`,
  );
}
