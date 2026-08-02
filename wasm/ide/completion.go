package ide

import (
	"fmt"
	"go/ast"
	"go/token"
	"go/types"
	"sort"
	"strings"
	"unicode"
	"unicode/utf8"
)

const completionMarker = "__goggle_completion__"

var completionKeywords = []string{
	"break", "case", "chan", "const", "continue", "default", "defer",
	"else", "fallthrough", "for", "func", "go", "goto", "if", "import",
	"interface", "map", "package", "range", "return", "select", "struct",
	"switch", "type", "var",
}

func (service *Service) Complete(params DocumentPosition) (*CompletionList, error) {
	current, err := service.snapshotFor(params)
	if err != nil {
		return nil, err
	}
	offset, err := offsetForPosition(current.document.Source, params.Position)
	if err != nil {
		return nil, err
	}

	start := identifierStart(current.document.Source, offset)
	prefix := current.document.Source[start:offset]
	modified := current.document.Source[:offset] + completionMarker + current.document.Source[offset:]
	completionSnapshot, err := buildSnapshot(Document{
		URI:     current.document.URI,
		Source:  modified,
		Version: current.document.Version,
	})
	if err != nil {
		return nil, fmt.Errorf("prepare completion: %w", err)
	}
	cursor := completionSnapshot.tokenFile.Pos(offset)
	replace, err := rangeForOffsets(current.document.Source, start, offset)
	if err != nil {
		return nil, err
	}

	candidates := make(map[string]CompletionItem)
	if selector := completionSelector(completionSnapshot.file); selector != nil {
		service.addSelectorCandidates(candidates, completionSnapshot, selector, prefix, replace)
	} else {
		addScopeCandidates(candidates, completionSnapshot, cursor, prefix, replace)
		addKeywordCandidates(candidates, prefix, replace)
	}

	items := make([]CompletionItem, 0, len(candidates))
	for _, item := range candidates {
		items = append(items, item)
	}
	sort.Slice(items, func(left, right int) bool {
		return items[left].Label < items[right].Label
	})
	return &CompletionList{Items: items}, nil
}

func completionSelector(file *ast.File) *ast.SelectorExpr {
	var result *ast.SelectorExpr
	ast.Inspect(file, func(node ast.Node) bool {
		selector, ok := node.(*ast.SelectorExpr)
		if ok && strings.HasSuffix(selector.Sel.Name, completionMarker) {
			result = selector
			return false
		}
		return result == nil
	})
	return result
}

func (service *Service) addSelectorCandidates(
	candidates map[string]CompletionItem,
	snapshot *snapshot,
	selector *ast.SelectorExpr,
	prefix string,
	replace Range,
) {
	if identifier, ok := selector.X.(*ast.Ident); ok {
		if packageName, ok := snapshot.info.Uses[identifier].(*types.PkgName); ok {
			addObjectCandidates(candidates, packageName.Imported().Scope(), prefix, replace, token.NoPos)
			return
		}
	}

	typeOfReceiver := snapshot.info.TypeOf(selector.X)
	if typeOfReceiver == nil {
		return
	}
	addMethodCandidates(candidates, typeOfReceiver, prefix, replace)
	addFieldCandidates(candidates, typeOfReceiver, prefix, replace)
}

func addScopeCandidates(
	candidates map[string]CompletionItem,
	snapshot *snapshot,
	position token.Pos,
	prefix string,
	replace Range,
) {
	var innermost *types.Scope
	for _, scope := range snapshot.info.Scopes {
		if !scope.Contains(position) {
			continue
		}
		if innermost == nil || scope.Pos() >= innermost.Pos() && scope.End() <= innermost.End() {
			innermost = scope
		}
	}
	if innermost == nil {
		innermost = snapshot.pkg.Scope()
	}

	for scope := innermost; scope != nil; scope = scope.Parent() {
		addObjectCandidates(candidates, scope, prefix, replace, position)
	}
}

func addObjectCandidates(
	candidates map[string]CompletionItem,
	scope *types.Scope,
	prefix string,
	replace Range,
	position token.Pos,
) {
	for _, name := range scope.Names() {
		object := scope.Lookup(name)
		if object == nil || !matchesPrefix(name, prefix) {
			continue
		}
		if position.IsValid() && object.Pos().IsValid() && object.Pos() > position && scope.Parent() != types.Universe {
			continue
		}
		addCandidate(candidates, objectCandidate(object, replace))
	}
}

func addMethodCandidates(
	candidates map[string]CompletionItem,
	receiver types.Type,
	prefix string,
	replace Range,
) {
	sets := []*types.MethodSet{types.NewMethodSet(receiver)}
	if _, isPointer := receiver.(*types.Pointer); !isPointer {
		sets = append(sets, types.NewMethodSet(types.NewPointer(receiver)))
	}
	for _, set := range sets {
		for index := 0; index < set.Len(); index++ {
			method := set.At(index).Obj()
			if !matchesPrefix(method.Name(), prefix) {
				continue
			}
			item := objectCandidate(method, replace)
			item.Kind = CompletionMethod
			addCandidate(candidates, item)
		}
	}
}

func addFieldCandidates(
	candidates map[string]CompletionItem,
	receiver types.Type,
	prefix string,
	replace Range,
) {
	if pointer, ok := receiver.(*types.Pointer); ok {
		receiver = pointer.Elem()
	}
	underlying := receiver.Underlying()
	structure, ok := underlying.(*types.Struct)
	if !ok {
		return
	}
	for index := 0; index < structure.NumFields(); index++ {
		field := structure.Field(index)
		if !matchesPrefix(field.Name(), prefix) {
			continue
		}
		item := objectCandidate(field, replace)
		item.Kind = CompletionField
		addCandidate(candidates, item)
	}
}

func addKeywordCandidates(
	candidates map[string]CompletionItem,
	prefix string,
	replace Range,
) {
	for _, keyword := range completionKeywords {
		if matchesPrefix(keyword, prefix) {
			addCandidate(candidates, CompletionItem{
				Label:      keyword,
				InsertText: keyword,
				Kind:       CompletionKeyword,
				Replace:    replace,
			})
		}
	}
}

func objectCandidate(object types.Object, replace Range) CompletionItem {
	return CompletionItem{
		Label:      object.Name(),
		Detail:     types.ObjectString(object, nil),
		InsertText: object.Name(),
		Kind:       completionKindForObject(object),
		Replace:    replace,
	}
}

func completionKindForObject(object types.Object) CompletionKind {
	switch object := object.(type) {
	case *types.Const:
		return CompletionConstant
	case *types.Func:
		if signature, ok := object.Type().(*types.Signature); ok && signature.Recv() != nil {
			return CompletionMethod
		}
		return CompletionFunction
	case *types.PkgName:
		return CompletionPackage
	case *types.TypeName:
		return CompletionType
	case *types.Var:
		if object.IsField() {
			return CompletionField
		}
		return CompletionVariable
	default:
		return CompletionVariable
	}
}

func addCandidate(candidates map[string]CompletionItem, item CompletionItem) {
	if _, exists := candidates[item.Label]; !exists {
		candidates[item.Label] = item
	}
}

func matchesPrefix(name, prefix string) bool {
	return strings.HasPrefix(strings.ToLower(name), strings.ToLower(prefix))
}

func identifierStart(source string, offset int) int {
	for offset > 0 {
		character, size := utf8.DecodeLastRuneInString(source[:offset])
		if character != '_' && !unicode.IsLetter(character) && !unicode.IsDigit(character) {
			break
		}
		offset -= size
	}
	return offset
}

func rangeForOffsets(source string, start, end int) (Range, error) {
	startPosition, err := positionForOffset(source, start)
	if err != nil {
		return Range{}, err
	}
	endPosition, err := positionForOffset(source, end)
	if err != nil {
		return Range{}, err
	}
	return Range{Start: startPosition, End: endPosition}, nil
}
