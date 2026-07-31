<div align="center">
  <img src="./public/goggle.svg" width="72" height="72" alt="Goggle logo">
  <h1>Goggle</h1>
  <p><strong>Explore Go code beyond the source.</strong></p>
  <p>
    A fast, private compiler explorer for inspecting Go syntax trees, control flow,<br>
    and static single-assignment form—entirely in your browser.
  </p>
  <p>
    <a href="https://yuxincs.github.io/goggle/">Open the live playground</a> ·
    <a href="https://github.com/yuxincs/goggle/issues">Report an issue</a>
  </p>
  <p>
    <a href="https://github.com/yuxincs/goggle/actions/workflows/build.yaml">
      <img src="https://github.com/yuxincs/goggle/actions/workflows/build.yaml/badge.svg" alt="Build status">
    </a>
    <a href="https://github.com/yuxincs/goggle/actions/workflows/release.yaml">
      <img src="https://github.com/yuxincs/goggle/actions/workflows/release.yaml/badge.svg" alt="Deployment status">
    </a>
    <a href="./LICENSE">
      <img src="https://img.shields.io/badge/license-MIT-66d9a8.svg" alt="MIT License">
    </a>
  </p>
</div>

<br>

<p align="center">
  <a href="https://yuxincs.github.io/goggle/">
    <img src="https://yuxincs.github.io/goggle/assets/screenshot.png" alt="Goggle showing Go source alongside AST, CFG, and SSA views">
  </a>
</p>

## See what the compiler sees

Goggle turns a Go source file into four synchronized panes. Edit the source or
move the cursor and the analysis views update around your current location.

| View | What it shows |
| --- | --- |
| **Go Source** | An editable Monaco workspace with syntax highlighting |
| **AST** | The parsed abstract syntax tree produced by `go/ast` |
| **CFG** | Per-function control-flow graphs produced by `golang.org/x/tools/go/cfg` |
| **SSA** | The program's static single-assignment representation from `golang.org/x/tools/go/ssa` |

## Why Goggle?

- **Runs locally.** Source code stays in the browser; there is no analysis server.
- **Instant feedback.** The Go analysis engine is compiled to WebAssembly.
- **Built for exploration.** Resizable panes keep source and intermediate forms visible together.
- **No setup required.** Open the playground and start editing Go.
- **Light and dark themes.** Use the workspace comfortably in either environment.

> [!NOTE]
> Goggle is an evolving proof of concept. It currently targets the latest major
> Go version and is not yet intended to replace production compiler tooling.

## Develop locally

### Prerequisites

- Node.js and npm
- The latest stable Go toolchain

Install dependencies and start the development server:

```sh
npm install
npm run dev
```

The `predev` script compiles the Go analyzer in [`wasm`](./wasm) to WebAssembly
and copies Go's `wasm_exec.js` runtime into the frontend automatically.

If you change the Go code, restart the development server so the WebAssembly
module is rebuilt.

Create a production build with:

```sh
npm run build
```

The optimized site is written to `dist/`.

## How it works

1. Vite loads the React interface and Monaco editors.
2. The browser starts the Go WebAssembly module.
3. Source is parsed and type-checked with Go's compiler libraries.
4. AST, CFG, and SSA representations are returned directly to the synchronized viewers.

Everything happens within the browser tab.

## Contributing

Issues and pull requests are welcome. For substantial changes, open an issue
first so the design and scope can be discussed.

## License

Goggle is available under the [MIT License](./LICENSE).
