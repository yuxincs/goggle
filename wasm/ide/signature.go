package ide

import (
	"go/ast"
	"go/token"
	"go/types"
	"strings"
)

func (service *Service) SignatureHelp(params DocumentPosition) (*SignatureHelp, error) {
	snapshot, err := service.snapshotFor(params)
	if err != nil {
		return nil, err
	}
	offset, err := offsetForPosition(snapshot.document.Source, params.Position)
	if err != nil {
		return nil, err
	}
	position := snapshot.tokenFile.Pos(offset)
	call := callAtPosition(snapshot.file, position)
	if call == nil {
		return nil, nil
	}

	signature, ok := snapshot.info.TypeOf(call.Fun).(*types.Signature)
	if !ok {
		return nil, nil
	}
	activeParameter := 0
	for _, argument := range call.Args {
		if argument.End() < position {
			activeParameter++
		}
	}
	if count := signature.Params().Len(); count > 0 && activeParameter >= count {
		activeParameter = count - 1
	}

	return &SignatureHelp{
		Signatures:      []SignatureInformation{signatureInformation(snapshot, call, signature)},
		ActiveSignature: 0,
		ActiveParameter: activeParameter,
	}, nil
}

func callAtPosition(file *ast.File, position token.Pos) *ast.CallExpr {
	var result *ast.CallExpr
	ast.Inspect(file, func(node ast.Node) bool {
		call, ok := node.(*ast.CallExpr)
		if !ok || position < call.Lparen || position > call.End() {
			return true
		}
		result = call
		return true
	})
	return result
}

func signatureInformation(
	snapshot *snapshot,
	call *ast.CallExpr,
	signature *types.Signature,
) SignatureInformation {
	name := "func"
	switch function := call.Fun.(type) {
	case *ast.Ident:
		name = function.Name
	case *ast.SelectorExpr:
		name = function.Sel.Name
	}
	label := strings.TrimPrefix(
		types.TypeString(signature, types.RelativeTo(snapshot.pkg)),
		"func",
	)

	parameters := make([]ParameterInformation, 0, signature.Params().Len())
	for index := 0; index < signature.Params().Len(); index++ {
		parameter := signature.Params().At(index)
		parameterType := parameter.Type()
		variadic := signature.Variadic() && index == signature.Params().Len()-1
		if variadic {
			if slice, ok := parameterType.(*types.Slice); ok {
				parameterType = slice.Elem()
			}
		}
		typeLabel := types.TypeString(parameterType, types.RelativeTo(snapshot.pkg))
		if variadic {
			typeLabel = "..." + typeLabel
		}
		parameterLabel := typeLabel
		if parameter.Name() != "" {
			parameterLabel = parameter.Name() + " " + typeLabel
		}
		parameters = append(parameters, ParameterInformation{Label: parameterLabel})
	}

	return SignatureInformation{
		Label:      name + label,
		Parameters: parameters,
	}
}
