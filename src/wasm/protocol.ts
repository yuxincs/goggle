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
