package ast_test

import (
	"encoding/json"
	"go/parser"
	"go/token"
	"path/filepath"
	"testing"

	astanalysis "github.com/yuxincs/goggle/ast"
	"github.com/yuxincs/goggle/goggletest"
)

func TestAnalyzeGolden(t *testing.T) {
	fset := token.NewFileSet()
	inputPath := filepath.Join("testdata", "foo.input.go")
	file, err := parser.ParseFile(fset, inputPath, nil, parser.ParseComments)
	if err != nil {
		t.Fatalf("parse input: %v", err)
	}

	actual, err := json.MarshalIndent(astanalysis.Analyze(fset, file), "", "  ")
	if err != nil {
		t.Fatalf("marshal AST: %v", err)
	}
	actual = append(actual, '\n')

	goggletest.AssertGolden(
		t,
		filepath.Join("testdata", "foo.expected.json"),
		actual,
	)
}
