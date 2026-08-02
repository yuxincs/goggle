package ssa_test

import (
	"encoding/json"
	"go/parser"
	"go/token"
	"path/filepath"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
	"github.com/yuxincs/goggle/internal/goggletest"
	ssaanalysis "github.com/yuxincs/goggle/ssa"
)

func TestAnalyzeGolden(t *testing.T) {
	inputPaths, err := filepath.Glob(filepath.Join("testdata", "*.input.go"))
	require.NoError(t, err, "discover input files")
	require.Positive(t, len(inputPaths), "no SSA fixtures matching testdata/*.input.go were found")

	for _, inputPath := range inputPaths {
		name := strings.TrimSuffix(filepath.Base(inputPath), ".input.go")
		t.Run(name, func(t *testing.T) {
			t.Parallel()

			fset := token.NewFileSet()
			file, err := parser.ParseFile(fset, inputPath, nil, parser.ParseComments)
			require.NoError(t, err, "parse input")

			actualResult, err := ssaanalysis.Analyze(fset, file)
			require.NoError(t, err, "analyze SSA")
			actual, err := json.MarshalIndent(actualResult, "", "  ")
			require.NoError(t, err, "marshal SSA")
			actual = append(actual, '\n')

			goggletest.AssertGolden(
				t,
				strings.TrimSuffix(inputPath, ".input.go")+".expected.json",
				actual,
			)
		})
	}
}
