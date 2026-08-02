package stdlib

import (
	"bytes"
	_ "embed"
	"fmt"
	"go/token"
	"go/types"
	"sync"

	"github.com/yuxincs/goggle/internal/stdlib/bundle"
	"golang.org/x/tools/go/gcexportdata"
)

//go:generate go run ../../cmd/stdlibbundle -output stdlib.bundle

//go:embed stdlib.bundle
var bundleData []byte

var (
	bundleOnce    sync.Once
	bundleEntries map[string][]byte
	bundleError   error
)

func NewImporter(fset *token.FileSet) (types.Importer, error) {
	bundleOnce.Do(loadBundle)
	if bundleError != nil {
		return nil, bundleError
	}

	return &bundleImporter{
		fset:     fset,
		packages: make(map[string]*types.Package),
	}, nil
}

type bundleImporter struct {
	fset     *token.FileSet
	packages map[string]*types.Package
}

func (current *bundleImporter) Import(path string) (*types.Package, error) {
	if path == "unsafe" {
		return types.Unsafe, nil
	}
	if pkg := current.packages[path]; pkg != nil && pkg.Complete() {
		return pkg, nil
	}
	definition, ok := bundleEntries[path]
	if !ok {
		return nil, fmt.Errorf("package %q is not available in the bundled Go standard library", path)
	}
	return gcexportdata.Read(bytes.NewReader(definition), current.fset, current.packages, path)
}

func loadBundle() {
	parsed, err := bundle.Parse(bundleData)
	if err != nil {
		bundleError = fmt.Errorf("open bundled Go standard library: %w", err)
		return
	}
	bundleEntries = parsed.Entries
}
