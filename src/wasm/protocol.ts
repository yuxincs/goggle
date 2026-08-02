export interface SourcePosition {
  offset: number;
  line: number;
  column: number;
}

export interface SourceRange {
  start: SourcePosition;
  end: SourcePosition;
}

export interface ASTChild {
  field: string;
  index?: number;
  node: ASTNode;
}

export interface ASTNode {
  type: string;
  range: SourceRange;
  properties?: Record<string, string>;
  children?: ASTChild[];
}

export interface SyntaxNode {
  type: string;
  range: SourceRange;
  source: string;
}

export interface CFGBlock {
  index: number;
  kind: string;
  live: boolean;
  statement?: SyntaxNode;
  nodes: SyntaxNode[];
  successors: number[];
}

export interface CFGFunction {
  name: string;
  range: SourceRange;
  noReturn: boolean;
  blocks: CFGBlock[];
}

export interface SSAValue {
  name: string;
  type: string;
  text: string;
}

export interface SSAInstruction {
  index: number;
  opcode: string;
  text: string;
  position?: SourcePosition;
  result?: SSAValue;
  operands: SSAValue[];
}

export interface SSABlock {
  index: number;
  comment?: string;
  predecessors: number[];
  successors: number[];
  instructions: SSAInstruction[];
}

export interface SSAFunction {
  name: string;
  signature: string;
  position: SourcePosition;
  parameters: SSAValue[];
  blocks: SSABlock[];
}

export interface AnalysisResult {
  ast: ASTNode;
  cfgs: CFGFunction[];
  ssa: SSAFunction[];
}

export type WasmParseResult =
  | { body: string; error?: undefined }
  | { body?: undefined; error: string };

export interface IDEDocument {
  uri: string;
  source: string;
  version: number;
}

export interface IDEPosition {
  line: number;
  character: number;
}

export interface IDERange {
  start: IDEPosition;
  end: IDEPosition;
}

export interface IDEDocumentPosition {
  uri: string;
  version: number;
  position: IDEPosition;
}

export type IDECompletionKind =
  | "constant"
  | "field"
  | "function"
  | "keyword"
  | "method"
  | "package"
  | "type"
  | "variable";

export interface IDECompletionItem {
  label: string;
  detail?: string;
  insertText: string;
  kind: IDECompletionKind;
  replace: IDERange;
}

export interface IDECompletionList {
  items: IDECompletionItem[];
}

export interface IDEHover {
  contents: string;
  range?: IDERange;
}

export interface IDELocation {
  uri: string;
  range: IDERange;
}

export interface IDEParameterInformation {
  label: string;
  documentation?: string;
}

export interface IDESignatureInformation {
  label: string;
  documentation?: string;
  parameters: IDEParameterInformation[];
}

export interface IDESignatureHelp {
  signatures: IDESignatureInformation[];
  activeSignature: number;
  activeParameter: number;
}

export interface IDERequestMap {
  update: IDEDocument;
  completion: IDEDocumentPosition;
  hover: IDEDocumentPosition;
  definition: IDEDocumentPosition;
  signatureHelp: IDEDocumentPosition;
}

export interface IDEResultMap {
  update: null;
  completion: IDECompletionList;
  hover: IDEHover | null;
  definition: IDELocation | null;
  signatureHelp: IDESignatureHelp | null;
}

export type IDEMethod = keyof IDERequestMap;
