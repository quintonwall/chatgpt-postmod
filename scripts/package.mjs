import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  writeFile,
  rm,
  readdir,
  lstat,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
const root = resolve(".");
const { version } = JSON.parse(await readFile("package.json", "utf8"));
const output = join(root, "releases");
await mkdir(output, { recursive: true });
const temporary = await mkdtemp(join(tmpdir(), "postmod-package-"));
const name = `postmod-${version}-local`;
const stage = join(temporary, name);
const files = [
  "package.json",
  "package-lock.json",
  "README.md",
  "INSTALL.md",
  ".env.example",
  "index.html",
  "vite.config.ts",
  "tsconfig.json",
  "src",
  "server",
  "scripts",
  "tests",
  "docs",
  "plugins",
  "dist",
];
try {
  await mkdir(stage);
  for (const file of files)
    await cp(join(root, file), join(stage, file), { recursive: true });
  const entries = [];
  async function scan(directory) {
    for (const item of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, item.name);
      if ((await lstat(path)).isSymbolicLink())
        throw new Error(`Symlink not allowed: ${path}`);
      if (item.isDirectory()) await scan(path);
      else {
        if ([".env", "runs.json", ".DS_Store"].includes(item.name))
          throw new Error(`Private file in release: ${path}`);
        entries.push(
          `${createHash("sha256")
            .update(await readFile(path))
            .digest("hex")}  ${path.slice(stage.length + 1)}`,
        );
      }
    }
  }
  await scan(stage);
  await writeFile(
    join(stage, "CONTENTS.sha256"),
    entries.sort().join("\n") + "\n",
  );
  const archive = join(output, name + ".zip");
  await rm(archive, { force: true });
  execFileSync("zip", ["-q", "-r", archive, name], { cwd: temporary });
  const hash = createHash("sha256")
    .update(await readFile(archive))
    .digest("hex");
  await writeFile(archive + ".sha256", `${hash}  ${name}.zip\n`);
  console.log(`Packaged ${entries.length} files: ${archive}`);
} finally {
  await rm(temporary, { recursive: true, force: true });
}
