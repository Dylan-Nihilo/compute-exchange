import {existsSync, readFileSync, rmSync, writeFileSync} from "node:fs";
import {join} from "node:path";
import {spawnSync} from "node:child_process";

import {loadLocalEnv} from "./load-local-env.mjs";

const root = process.cwd();
loadLocalEnv(root);

const gitignorePath = join(root, ".gitignore");
const vercelPath = join(root, "vercel.json");
const gitignoreBefore = readFileSync(gitignorePath, "utf8");
const vercelBefore = existsSync(vercelPath)
  ? readFileSync(vercelPath, "utf8")
  : null;

if (!process.env.HEROUI_KEY) {
  console.error("HEROUI_KEY is required. Store it in .env.local, then retry.");
  process.exit(1);
}

const setup = spawnSync(
  "npx",
  ["-y", "hpsetup@latest", "react", "--auto"],
  {cwd: root, env: process.env, stdio: "inherit"},
);

writeFileSync(gitignorePath, gitignoreBefore);

if (vercelBefore === null) {
  rmSync(vercelPath, {force: true});
} else {
  writeFileSync(vercelPath, vercelBefore);
}

if (setup.status !== 0) {
  process.exit(setup.status ?? 1);
}

const proCss = join(
  root,
  "node_modules",
  "@heroui-pro",
  "react",
  "dist",
  "css",
  "index.css",
);

if (!existsSync(proCss)) {
  console.error("HeroUI Pro CSS is missing after setup.");
  process.exit(1);
}

const cssImport = '@import "@heroui-pro/react/css";';
const globalsPath = join(root, "src", "app", "globals.css");
const globals = readFileSync(globalsPath, "utf8");

if (!globals.includes(cssImport)) {
  writeFileSync(
    globalsPath,
    globals.replace(
      '@import "@heroui/styles";',
      `@import "@heroui/styles";\n${cssImport}`,
    ),
  );
}

console.log("HeroUI Pro installation verified.");
