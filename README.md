# Goggle [![Build](https://github.com/yuxincs/goggle/actions/workflows/build.yaml/badge.svg)](https://github.com/yuxincs/goggle/actions/workflows/build.yaml) [![Deploy to GitHub Pages](https://github.com/yuxincs/goggle/actions/workflows/release.yaml/badge.svg)](https://github.com/yuxincs/goggle/actions/workflows/release.yaml)

Hosted via Github Pages: https://yuxincs.github.io/goggle/

> [!CAUTION]
> This project is currently just a PoC to show that it is possible to do this completely in browser. However, I plan to 
> slowly polish it, add more features to it, and then properly release it.

Goggle is an in-browser tool that visualizes your Go code in different forms (AST, CFG, SSA) to aid the development of
program analyzers for Go.

## Developing

The project is managed by `vite`, and `wasm` contains the Go wasm backend. Building the project basically requires the
following steps:

(1) Fetch the `wasm_exec.js` file from `$(go env GOROOT)/lib/wasm/wasm_exec.js` and copy it to `src/assets`.

(2) Go to `wasm` dir (which hosts the Go code), build the Go code into wasm to `src/assets/goggle.wasm`.

(3) Build the frontend React code (that loads the wasm code and renders the frontend) to `dist` dir.

Simply run `npm run build` that does the above for you. You can also un `npm run dev` to start a local development web 
server (and the build happens continuously in the background). Note that if Go code is updated you have to kill the 
process and re-run `npm run dev` (since building the Go code is configured as a `predev` and `prebuild` step).

Currently, only the latest major version of Go is supported. 

## License
[MIT](https://github.com/yuxincs/goggle/blob/main/LICENSE).
