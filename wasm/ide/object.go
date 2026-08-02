package ide

import (
	"errors"
	"go/ast"
	"go/token"
	"go/types"
)

type resolvedObject struct {
	identifier *ast.Ident
	object     types.Object
	selection  *types.Selection
}

func objectAtPosition(snapshot *snapshot, position Position) (*resolvedObject, error) {
	offset, err := offsetForPosition(snapshot.document.Source, position)
	if err != nil {
		return nil, err
	}
	tokenPosition := snapshot.tokenFile.Pos(offset)

	var identifier *ast.Ident
	ast.Inspect(snapshot.file, func(node ast.Node) bool {
		current, ok := node.(*ast.Ident)
		if !ok || tokenPosition < current.Pos() || tokenPosition > current.End() {
			return true
		}
		identifier = current
		return false
	})
	if identifier == nil {
		return nil, nil
	}

	object := snapshot.info.ObjectOf(identifier)
	if object == nil {
		return nil, nil
	}
	return &resolvedObject{
		identifier: identifier,
		object:     object,
		selection:  selectionForIdentifier(snapshot.info, identifier),
	}, nil
}

func selectionForIdentifier(info *types.Info, identifier *ast.Ident) *types.Selection {
	for expression, selection := range info.Selections {
		if expression.Sel == identifier {
			return selection
		}
	}
	return nil
}

func rangeForNode(snapshot *snapshot, node ast.Node) (Range, error) {
	if snapshot.tokenFile == nil {
		return Range{}, errors.New("IDE document has no token file")
	}
	return rangeForOffsets(
		snapshot.document.Source,
		snapshot.tokenFile.Offset(node.Pos()),
		snapshot.tokenFile.Offset(node.End()),
	)
}

func objectPosition(snapshot *snapshot, object types.Object) (token.Position, bool) {
	if !object.Pos().IsValid() {
		return token.Position{}, false
	}
	position := snapshot.fset.PositionFor(object.Pos(), false)
	return position, position.IsValid()
}
