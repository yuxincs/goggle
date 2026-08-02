package ide

import "encoding/json"

type Method string

const (
	MethodUpdate        Method = "update"
	MethodCompletion    Method = "completion"
	MethodHover         Method = "hover"
	MethodDefinition    Method = "definition"
	MethodSignatureHelp Method = "signatureHelp"
)

type Request struct {
	Method Method          `json:"method"`
	Params json.RawMessage `json:"params"`
}

type Document struct {
	URI     string `json:"uri"`
	Source  string `json:"source"`
	Version int    `json:"version"`
}

type Position struct {
	Line      int `json:"line"`
	Character int `json:"character"`
}

type Range struct {
	Start Position `json:"start"`
	End   Position `json:"end"`
}

type DocumentPosition struct {
	URI      string   `json:"uri"`
	Version  int      `json:"version"`
	Position Position `json:"position"`
}

type CompletionKind string

const (
	CompletionConstant CompletionKind = "constant"
	CompletionField    CompletionKind = "field"
	CompletionFunction CompletionKind = "function"
	CompletionKeyword  CompletionKind = "keyword"
	CompletionMethod   CompletionKind = "method"
	CompletionPackage  CompletionKind = "package"
	CompletionType     CompletionKind = "type"
	CompletionVariable CompletionKind = "variable"
)

type CompletionItem struct {
	Label      string         `json:"label"`
	Detail     string         `json:"detail,omitempty"`
	InsertText string         `json:"insertText"`
	Kind       CompletionKind `json:"kind"`
	Replace    Range          `json:"replace"`
}

type CompletionList struct {
	Items []CompletionItem `json:"items"`
}

type Hover struct {
	Contents string `json:"contents"`
	Range    *Range `json:"range,omitempty"`
}

type Location struct {
	URI   string `json:"uri"`
	Range Range  `json:"range"`
}

type ParameterInformation struct {
	Label         string `json:"label"`
	Documentation string `json:"documentation,omitempty"`
}

type SignatureInformation struct {
	Label         string                 `json:"label"`
	Documentation string                 `json:"documentation,omitempty"`
	Parameters    []ParameterInformation `json:"parameters"`
}

type SignatureHelp struct {
	Signatures      []SignatureInformation `json:"signatures"`
	ActiveSignature int                    `json:"activeSignature"`
	ActiveParameter int                    `json:"activeParameter"`
}
