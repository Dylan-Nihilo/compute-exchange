import {existsSync} from "node:fs";
import {join} from "node:path";
import {loadEnvFile} from "node:process";

export function loadLocalEnv(root) {
  for (const name of [".env.local", ".env"]) {
    const path = join(root, name);

    if (existsSync(path)) {
      loadEnvFile(path);
    }
  }
}
