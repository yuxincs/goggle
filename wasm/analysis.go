package main

import (
	"fmt"
	"go/parser"
	"go/token"

	astanalysis "github.com/yuxincs/goggle/ast"
	cfganalysis "github.com/yuxincs/goggle/cfg"
	ssaanalysis "github.com/yuxincs/goggle/ssa"
)

type Result struct {
	AST  *astanalysis.Node       `json:"ast"`
	CFGs []*cfganalysis.Function `json:"cfgs"`
	SSA  []*ssaanalysis.Function `json:"ssa"`
}

func parse(src string) (*Result, error) {
	fset := token.NewFileSet()
	file, err := parser.ParseFile(fset, "main.go", src, parser.ParseComments)
	if err != nil {
		return nil, err
	}

	ssaFunctions, err := ssaanalysis.Analyze(fset, file)
	if err != nil {
		return nil, fmt.Errorf("build SSA: %w", err)
	}

	return &Result{
		AST:  astanalysis.Analyze(fset, file),
		CFGs: cfganalysis.Analyze(fset, file),
		SSA:  ssaFunctions,
	}, nil
}
