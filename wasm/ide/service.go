package ide

import (
	"encoding/json"
	"errors"
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"go/types"

	"github.com/yuxincs/goggle/internal/stdlib"
)

var ErrNotImplemented = errors.New("IDE capability is not implemented")

type Service struct {
	snapshot *snapshot
}

type snapshot struct {
	document  Document
	fset      *token.FileSet
	file      *ast.File
	tokenFile *token.File
	pkg       *types.Package
	info      *types.Info
}

func NewService() *Service {
	return &Service{}
}

func (service *Service) Handle(request Request) (any, error) {
	switch request.Method {
	case MethodUpdate:
		var document Document
		if err := json.Unmarshal(request.Params, &document); err != nil {
			return nil, fmt.Errorf("decode document update: %w", err)
		}
		return nil, service.Update(document)
	case MethodCompletion:
		var params DocumentPosition
		if err := json.Unmarshal(request.Params, &params); err != nil {
			return nil, fmt.Errorf("decode completion request: %w", err)
		}
		return service.Complete(params)
	case MethodHover:
		var params DocumentPosition
		if err := json.Unmarshal(request.Params, &params); err != nil {
			return nil, fmt.Errorf("decode hover request: %w", err)
		}
		return service.Hover(params)
	case MethodDefinition:
		var params DocumentPosition
		if err := json.Unmarshal(request.Params, &params); err != nil {
			return nil, fmt.Errorf("decode definition request: %w", err)
		}
		return service.Definition(params)
	case MethodSignatureHelp:
		var params DocumentPosition
		if err := json.Unmarshal(request.Params, &params); err != nil {
			return nil, fmt.Errorf("decode signature help request: %w", err)
		}
		return service.SignatureHelp(params)
	default:
		return nil, fmt.Errorf("unknown IDE method %q", request.Method)
	}
}

func (service *Service) Update(document Document) error {
	if service.snapshot != nil && service.snapshot.document == document {
		return nil
	}

	snapshot, err := buildSnapshot(document)
	if err != nil {
		return err
	}
	service.snapshot = snapshot
	return nil
}

func (service *Service) SignatureHelp(DocumentPosition) (*SignatureHelp, error) {
	return nil, fmt.Errorf("signature help: %w", ErrNotImplemented)
}

func (service *Service) snapshotFor(params DocumentPosition) (*snapshot, error) {
	if service.snapshot == nil {
		return nil, errors.New("IDE document has not been initialized")
	}
	if service.snapshot.document.URI != params.URI {
		return nil, fmt.Errorf("IDE document %q is not open", params.URI)
	}
	if service.snapshot.document.Version != params.Version {
		return nil, fmt.Errorf(
			"stale IDE document version: got %d, want %d",
			params.Version,
			service.snapshot.document.Version,
		)
	}
	return service.snapshot, nil
}

func buildSnapshot(document Document) (*snapshot, error) {
	fset := token.NewFileSet()
	file, parseErr := parser.ParseFile(
		fset,
		document.URI,
		document.Source,
		parser.AllErrors|parser.ParseComments,
	)
	if file == nil {
		return nil, fmt.Errorf("parse IDE document: %w", parseErr)
	}

	importer, err := stdlib.NewImporter(fset)
	if err != nil {
		return nil, err
	}
	info := &types.Info{
		Types:      make(map[ast.Expr]types.TypeAndValue),
		Defs:       make(map[*ast.Ident]types.Object),
		Uses:       make(map[*ast.Ident]types.Object),
		Implicits:  make(map[ast.Node]types.Object),
		Selections: make(map[*ast.SelectorExpr]*types.Selection),
		Scopes:     make(map[ast.Node]*types.Scope),
	}
	config := &types.Config{
		Importer: importer,
		Error:    func(error) {},
	}
	pkg, _ := config.Check(file.Name.Name, fset, []*ast.File{file}, info)
	if pkg == nil {
		pkg = types.NewPackage(file.Name.Name, file.Name.Name)
	}

	return &snapshot{
		document:  document,
		fset:      fset,
		file:      file,
		tokenFile: fset.File(file.Pos()),
		pkg:       pkg,
		info:      info,
	}, nil
}
