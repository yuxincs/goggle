package cfg

import (
	"bytes"
	goast "go/ast"
	"go/format"
	"go/token"
	"reflect"
	"strings"

	"github.com/yuxincs/goggle/source"
	toolscfg "golang.org/x/tools/go/cfg"
)

type SyntaxNode struct {
	Type   string       `json:"type"`
	Range  source.Range `json:"range"`
	Source string       `json:"source"`
}

type Block struct {
	Index      int32         `json:"index"`
	Kind       string        `json:"kind"`
	Live       bool          `json:"live"`
	Statement  *SyntaxNode   `json:"statement,omitempty"`
	Nodes      []*SyntaxNode `json:"nodes"`
	Successors []int32       `json:"successors"`
}

type Function struct {
	Name     string       `json:"name"`
	Range    source.Range `json:"range"`
	NoReturn bool         `json:"noReturn"`
	Blocks   []*Block     `json:"blocks"`
}

func Analyze(fset *token.FileSet, file *goast.File) []*Function {
	functions := make([]*Function, 0)

	for _, declaration := range file.Decls {
		function, ok := declaration.(*goast.FuncDecl)
		if !ok || function.Body == nil {
			continue
		}

		graph := toolscfg.New(function.Body, func(*goast.CallExpr) bool { return true })
		blocks := make([]*Block, 0, len(graph.Blocks))
		for _, block := range graph.Blocks {
			nodes := make([]*SyntaxNode, 0, len(block.Nodes))
			for _, node := range block.Nodes {
				nodes = append(nodes, newSyntaxNode(fset, node))
			}

			successors := make([]int32, 0, len(block.Succs))
			for _, successor := range block.Succs {
				successors = append(successors, successor.Index)
			}

			blocks = append(blocks, &Block{
				Index:      block.Index,
				Kind:       block.Kind.String(),
				Live:       block.Live,
				Statement:  newSyntaxNode(fset, block.Stmt),
				Nodes:      nodes,
				Successors: successors,
			})
		}

		functions = append(functions, &Function{
			Name:     function.Name.Name,
			Range:    source.RangeFor(fset, function),
			NoReturn: graph.NoReturn(),
			Blocks:   blocks,
		})
	}

	return functions
}

func newSyntaxNode(fset *token.FileSet, node goast.Node) *SyntaxNode {
	if node == nil {
		return nil
	}

	var formatted bytes.Buffer
	if err := format.Node(&formatted, fset, node); err != nil {
		formatted.WriteString(nodeType(node))
	}

	return &SyntaxNode{
		Type:   nodeType(node),
		Range:  source.RangeFor(fset, node),
		Source: formatted.String(),
	}
}

func nodeType(node goast.Node) string {
	return strings.TrimPrefix(reflect.TypeOf(node).String(), "*ast.")
}
