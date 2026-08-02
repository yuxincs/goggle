import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDirectory = join(dirname(fileURLToPath(import.meta.url)), "..");
const wasmDirectory = join(rootDirectory, "wasm");
const assetsDirectory = join(rootDirectory, "src", "wasm", "generated");

function runGo(arguments_, options = {}) {
  return execFileSync("go", arguments_, {
    cwd: wasmDirectory,
    env: process.env,
    stdio: "inherit",
    ...options,
  });
}

mkdirSync(assetsDirectory, { recursive: true });
runGo(["generate", "./..."]);
runGo(["build", "-o", join(assetsDirectory, "goggle.wasm"), "./cmd/goggle-wasm"], {
  env: { ...process.env, GOOS: "js", GOARCH: "wasm" },
});

const goRoot = execFileSync("go", ["env", "GOROOT"], {
  cwd: wasmDirectory,
  encoding: "utf8",
}).trim();
copyFileSync(
  join(goRoot, "lib", "wasm", "wasm_exec.js"),
  join(assetsDirectory, "wasm_exec.js"),
);
