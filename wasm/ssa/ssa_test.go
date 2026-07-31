package ssa_test

import (
	"encoding/json"
	"go/parser"
	"go/token"
	"path/filepath"
	"testing"

	"github.com/yuxincs/goggle/goggletest"
	ssaanalysis "github.com/yuxincs/goggle/ssa"
)

func TestAnalyzeGolden(t *testing.T) {
	fset := token.NewFileSet()
	inputPath := filepath.Join("testdata", "foo.input.go")
	file, err := parser.ParseFile(fset, inputPath, nil, parser.ParseComments)
	if err != nil {
		t.Fatalf("parse input: %v", err)
	}

	actualResult, err := ssaanalysis.Analyze(fset, file)
	if err != nil {
		t.Fatalf("analyze SSA: %v", err)
	}
	actual, err := json.MarshalIndent(actualResult, "", "  ")
	if err != nil {
		t.Fatalf("marshal SSA: %v", err)
	}
	actual = append(actual, '\n')

	goggletest.AssertGolden(
		t,
		filepath.Join("testdata", "foo.expected.json"),
		actual,
	)
}
