package source

import (
	"go/ast"
	"go/token"
)

type Position struct {
	Offset int `json:"offset"`
	Line   int `json:"line"`
	Column int `json:"column"`
}

type Range struct {
	Start Position `json:"start"`
	End   Position `json:"end"`
}

func PositionFor(fset *token.FileSet, pos token.Pos) Position {
	position := fset.PositionFor(pos, false)
	return Position{
		Offset: position.Offset,
		Line:   position.Line,
		Column: position.Column,
	}
}

func RangeFor(fset *token.FileSet, node ast.Node) Range {
	return Range{
		Start: PositionFor(fset, node.Pos()),
		End:   PositionFor(fset, node.End()),
	}
}
