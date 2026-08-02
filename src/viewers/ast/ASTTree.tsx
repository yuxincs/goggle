import { useMemo, useState } from "react";
import { ASTNode } from "../../wasm/protocol.ts";

interface ASTTreeProps {
  root: ASTNode;
  sourceLine: number;
  onSourceLineSelect: (line: number) => void;
}

interface ASTTreeNodeProps extends ASTTreeProps {
  node: ASTNode;
  depth: number;
  label?: string;
  path: string;
  selectedPath: string | null;
}

const containsLine = (node: ASTNode, line: number) =>
  node.range.start.line <= line && node.range.end.line >= line;

const pathForLine = (
  node: ASTNode,
  line: number,
  path = "root",
): string | null => {
  if (!containsLine(node, line)) return null;

  for (const [childIndex, child] of (node.children ?? []).entries()) {
    const childPath = pathForLine(child.node, line, `${path}.${childIndex}`);
    if (childPath !== null) return childPath;
  }
  return path;
};

const ASTTreeNode = (props: ASTTreeNodeProps) => {
  const children = props.node.children ?? [];
  const [expandedOverride, setExpandedOverride] = useState<boolean | null>(null);
  const containsSelection = props.selectedPath?.startsWith(`${props.path}.`) ?? false;
  const isExpanded = expandedOverride ?? (props.depth < 2 || containsSelection);
  const properties = Object.entries(props.node.properties ?? {}).sort(([left], [right]) =>
    left.localeCompare(right)
  );

  return (
    <div className="ast-tree__branch">
      <div
        className={`ast-tree__row${props.selectedPath === props.path ? " ast-tree__row--selected" : ""}`}
        style={{ paddingLeft: `${8 + props.depth * 14}px` }}
      >
        <button
          type="button"
          className="ast-tree__disclosure"
          aria-label={`${isExpanded ? "Collapse" : "Expand"} ${props.node.type}`}
          aria-expanded={children.length === 0 ? undefined : isExpanded}
          disabled={children.length === 0}
          onClick={() => setExpandedOverride(!isExpanded)}
        >
          {children.length === 0 ? "·" : isExpanded ? "−" : "+"}
        </button>
        <button
          type="button"
          className="ast-tree__node"
          onClick={() => props.onSourceLineSelect(props.node.range.start.line)}
        >
          {props.label !== undefined && <span className="ast-tree__field">{props.label}</span>}
          <span className="ast-tree__type">{props.node.type}</span>
          {properties.slice(0, 2).map(([key, value]) => (
            <span className="ast-tree__property" key={key} title={`${key}=${value}`}>
              {key}={value}
            </span>
          ))}
          {properties.length > 2 && (
            <span className="ast-tree__property">+{properties.length - 2}</span>
          )}
          <span className="ast-tree__range">
            {props.node.range.start.line}:{props.node.range.start.column}
          </span>
        </button>
      </div>
      {isExpanded && children.map((child, childIndex) => (
        <ASTTreeNode
          key={`${child.field}-${child.index ?? childIndex}-${child.node.range.start.offset}`}
          {...props}
          node={child.node}
          depth={props.depth + 1}
          label={child.index === undefined ? child.field : `${child.field}[${child.index}]`}
          path={`${props.path}.${childIndex}`}
        />
      ))}
    </div>
  );
};

export const ASTTree = (props: ASTTreeProps) => {
  const selectedPath = useMemo(
    () => pathForLine(props.root, props.sourceLine),
    [props.root, props.sourceLine],
  );

  return (
    <div className="analysis-visual ast-tree" role="tree" aria-label="Abstract syntax tree">
      <ASTTreeNode
        {...props}
        node={props.root}
        depth={0}
        path="root"
        selectedPath={selectedPath}
      />
    </div>
  );
};
