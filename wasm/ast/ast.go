package ast

import (
	goast "go/ast"
	"go/token"
	"reflect"
	"strings"

	"github.com/yuxincs/goggle/source"
)

type Child struct {
	Field string `json:"field"`
	Index *int   `json:"index,omitempty"`
	Node  *Node  `json:"node"`
}

type Node struct {
	Type       string            `json:"type"`
	Range      source.Range      `json:"range"`
	Properties map[string]string `json:"properties,omitempty"`
	Children   []*Child          `json:"children,omitempty"`
}

func Analyze(fset *token.FileSet, node goast.Node) *Node {
	if node == nil {
		return nil
	}

	result := &Node{
		Type:       nodeType(node),
		Range:      source.RangeFor(fset, node),
		Properties: properties(node),
	}

	value := reflect.ValueOf(node)
	if value.Kind() == reflect.Pointer {
		value = value.Elem()
	}
	valueType := value.Type()

	for fieldIndex := 0; fieldIndex < value.NumField(); fieldIndex++ {
		field := value.Field(fieldIndex)
		fieldName := valueType.Field(fieldIndex).Name

		if child := nodeFromValue(field); child != nil {
			result.Children = append(result.Children, &Child{
				Field: fieldName,
				Node:  Analyze(fset, child),
			})
			continue
		}

		if field.Kind() != reflect.Slice {
			continue
		}
		for index := 0; index < field.Len(); index++ {
			child := nodeFromValue(field.Index(index))
			if child == nil {
				continue
			}
			childIndex := index
			result.Children = append(result.Children, &Child{
				Field: fieldName,
				Index: &childIndex,
				Node:  Analyze(fset, child),
			})
		}
	}

	return result
}

func nodeFromValue(value reflect.Value) goast.Node {
	if !value.IsValid() {
		return nil
	}
	if value.Kind() == reflect.Interface {
		if value.IsNil() {
			return nil
		}
		value = value.Elem()
	}
	if value.Kind() == reflect.Pointer && value.IsNil() {
		return nil
	}
	if !value.CanInterface() {
		return nil
	}
	node, _ := value.Interface().(goast.Node)
	return node
}

func nodeType(node goast.Node) string {
	return strings.TrimPrefix(reflect.TypeOf(node).String(), "*ast.")
}

func properties(node goast.Node) map[string]string {
	result := make(map[string]string)

	switch node := node.(type) {
	case *goast.File:
		result["package"] = node.Name.Name
	case *goast.Ident:
		result["name"] = node.Name
	case *goast.BasicLit:
		result["token"] = node.Kind.String()
		result["value"] = node.Value
	case *goast.Comment:
		result["text"] = node.Text
	case *goast.AssignStmt:
		result["token"] = node.Tok.String()
	case *goast.BranchStmt:
		result["token"] = node.Tok.String()
	case *goast.IncDecStmt:
		result["token"] = node.Tok.String()
	case *goast.BinaryExpr:
		result["operator"] = node.Op.String()
	case *goast.UnaryExpr:
		result["operator"] = node.Op.String()
	case *goast.ChanType:
		switch node.Dir {
		case goast.SEND:
			result["direction"] = "send"
		case goast.RECV:
			result["direction"] = "receive"
		default:
			result["direction"] = "bidirectional"
		}
	}

	if len(result) == 0 {
		return nil
	}
	return result
}
