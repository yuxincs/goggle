package ssa

import (
	goast "go/ast"
	"go/importer"
	"go/token"
	"go/types"
	"reflect"
	"strings"

	"github.com/yuxincs/goggle/source"
	toolsssa "golang.org/x/tools/go/ssa"
	"golang.org/x/tools/go/ssa/ssautil"
)

type Value struct {
	Name string `json:"name"`
	Type string `json:"type"`
	Text string `json:"text"`
}

type Instruction struct {
	Index    int              `json:"index"`
	Opcode   string           `json:"opcode"`
	Text     string           `json:"text"`
	Position *source.Position `json:"position,omitempty"`
	Result   *Value           `json:"result,omitempty"`
	Operands []*Value         `json:"operands"`
}

type Block struct {
	Index        int            `json:"index"`
	Comment      string         `json:"comment,omitempty"`
	Predecessors []int          `json:"predecessors"`
	Successors   []int          `json:"successors"`
	Instructions []*Instruction `json:"instructions"`
}

type Function struct {
	Name       string          `json:"name"`
	Signature  string          `json:"signature"`
	Position   source.Position `json:"position"`
	Parameters []*Value        `json:"parameters"`
	Blocks     []*Block        `json:"blocks"`
}

func Analyze(fset *token.FileSet, file *goast.File) ([]*Function, error) {
	pkg := types.NewPackage("main", "")
	ssaPkg, typesInfo, err := ssautil.BuildPackage(
		&types.Config{Importer: importer.Default()},
		fset,
		pkg,
		[]*goast.File{file},
		toolsssa.SanityCheckFunctions,
	)
	if err != nil {
		return nil, err
	}

	functions := make([]*Function, 0)
	for _, declaration := range file.Decls {
		function, ok := declaration.(*goast.FuncDecl)
		if !ok {
			continue
		}
		object, ok := typesInfo.ObjectOf(function.Name).(*types.Func)
		if !ok {
			continue
		}
		ssaFunction := ssaPkg.Prog.FuncValue(object)
		if ssaFunction == nil {
			continue
		}

		parameters := make([]*Value, 0, len(ssaFunction.Params))
		for _, parameter := range ssaFunction.Params {
			parameters = append(parameters, newValue(parameter))
		}

		blocks := make([]*Block, 0, len(ssaFunction.Blocks))
		for _, block := range ssaFunction.Blocks {
			instructions := make([]*Instruction, 0, len(block.Instrs))
			for index, instruction := range block.Instrs {
				instructions = append(instructions, newInstruction(fset, index, instruction))
			}

			blocks = append(blocks, &Block{
				Index:        block.Index,
				Comment:      block.Comment,
				Predecessors: blockIndexes(block.Preds),
				Successors:   blockIndexes(block.Succs),
				Instructions: instructions,
			})
		}

		functions = append(functions, &Function{
			Name:       function.Name.Name,
			Signature:  ssaFunction.Signature.String(),
			Position:   source.PositionFor(fset, ssaFunction.Pos()),
			Parameters: parameters,
			Blocks:     blocks,
		})
	}

	return functions, nil
}

func newInstruction(fset *token.FileSet, index int, instruction toolsssa.Instruction) *Instruction {
	result := &Instruction{
		Index:    index,
		Opcode:   strings.TrimPrefix(reflect.TypeOf(instruction).String(), "*ssa."),
		Text:     instruction.String(),
		Operands: make([]*Value, 0),
	}

	if instruction.Pos().IsValid() {
		position := source.PositionFor(fset, instruction.Pos())
		result.Position = &position
	}
	if value, ok := instruction.(toolsssa.Value); ok {
		result.Result = newValue(value)
	}
	for _, operand := range instruction.Operands(nil) {
		if operand == nil || *operand == nil {
			continue
		}
		result.Operands = append(result.Operands, newValue(*operand))
	}

	return result
}

func newValue(value toolsssa.Value) *Value {
	if value == nil {
		return nil
	}

	typeName := ""
	if value.Type() != nil {
		typeName = value.Type().String()
	}
	return &Value{
		Name: value.Name(),
		Type: typeName,
		Text: value.String(),
	}
}

func blockIndexes(blocks []*toolsssa.BasicBlock) []int {
	indexes := make([]int, 0, len(blocks))
	for _, block := range blocks {
		indexes = append(indexes, block.Index)
	}
	return indexes
}
