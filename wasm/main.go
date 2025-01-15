package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"go/ast"
	"go/importer"
	"go/parser"
	"go/token"
	"go/types"
	"golang.org/x/tools/go/cfg"
	"golang.org/x/tools/go/ssa"
	"golang.org/x/tools/go/ssa/ssautil"

	"syscall/js"
)

type CFGResult struct {
	Name string `json:"name"`
	Repr string `json:"repr"`
	Dot  string `json:"dot"`
}

type Result struct {
	AST  string       `json:"ast"`
	CFGs []*CFGResult `json:"cfgs"`
	SSA  string       `json:"ssa"`
}

func parse(src string) (*Result, error) {
	result := &Result{}

	// Parse the source and store the AST representations.
	fset := token.NewFileSet()
	f, err := parser.ParseFile(fset, "main.go", src, 0)
	if err != nil {
		return nil, err
	}
	var buf bytes.Buffer
	if err := ast.Fprint(&buf, fset, f, nil); err != nil {
		return nil, fmt.Errorf("print ast: %w", err)
	}
	result.AST = buf.String()

	// Construct CFGs.
	var graphs []*CFGResult
	for _, decl := range f.Decls {
		funcDecl, ok := decl.(*ast.FuncDecl)
		if !ok {
			continue
		}
		graph := cfg.New(funcDecl.Body, func(expr *ast.CallExpr) bool { return true })
		position := fset.Position(funcDecl.Name.Pos())
		name := fmt.Sprintf("%s:%d:%d", funcDecl.Name.Name, position.Line, position.Column)
		graphs = append(graphs, &CFGResult{
			Name: name,
			Repr: graph.Format(fset),
			Dot:  graph.Dot(fset),
		})
	}
	result.CFGs = graphs

	// Create the type-checker's package.
	pkg := types.NewPackage("main", "")

	files := []*ast.File{f}

	// Type-check the package, load dependencies.
	ssaPkg, typesInfo, err := ssautil.BuildPackage(&types.Config{Importer: importer.Default()}, fset, pkg, files, ssa.SanityCheckFunctions)
	if err != nil {
		return nil, fmt.Errorf("build packages: %w", err)
	}

	buf.Reset()
	for _, decl := range f.Decls {
		funcDecl, ok := decl.(*ast.FuncDecl)
		if !ok {
			continue
		}
		fn, ok := typesInfo.ObjectOf(funcDecl.Name).(*types.Func)
		if !ok {
			continue
		}

		ssaFunc := ssaPkg.Prog.FuncValue(fn)
		position := fset.Position(funcDecl.Name.Pos())
		name := fmt.Sprintf("%s:%d:%d", funcDecl.Name.Name, position.Line, position.Column)
		buf.WriteString(name + "\n")
		ssa.WriteFunction(&buf, ssaFunc)
	}
	result.SSA = buf.String()

	return result, nil
}

func main() {
	js.Global().Set("parse", js.FuncOf(func(this js.Value, args []js.Value) (output any) {
		defer func() {
			if r := recover(); r != nil {
				output = js.ValueOf(map[string]interface{}{
					"error": fmt.Sprintf("%s", r),
				})
			}
		}()

		if len(args) != 1 {
			return js.ValueOf(map[string]interface{}{
				"error": fmt.Sprintf("expected 1 argument, got %d", len(args)),
			})
		}
		if args[0].Type() != js.TypeString {
			return js.ValueOf(map[string]interface{}{
				"error": fmt.Sprintf("expected a string, got %s", args[0].Type()),
			})
		}

		result, err := parse(args[0].String())
		if err != nil {
			return js.ValueOf(map[string]interface{}{
				"error": err.Error(),
			})
		}
		data, err := json.Marshal(result)
		if err != nil {
			return js.ValueOf(map[string]interface{}{
				"error": err.Error(),
			})
		}
		return js.ValueOf(map[string]interface{}{
			"body": string(data),
		})
	}))

	// Wait forever to keep the Go wasm module running.
	<-make(chan struct{})
}
