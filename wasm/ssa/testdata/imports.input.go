package sample

import "go/ast"

func exported(name string) bool {
	return ast.IsExported(name)
}
