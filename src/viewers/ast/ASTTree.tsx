import { useEffect, useMemo, useRef, useState } from "react";
import { ASTNode } from "../../wasm/protocol.ts";
import { AnalysisPosition } from "../shared/lineMapping.ts";

interface ASTTreeProps {
  root: ASTNode;
  sourcePosition: AnalysisPosition;
  onSourcePositionSelect: (position: AnalysisPosition) => void;
}

interface ASTTreeNodeProps extends ASTTreeProps {
  node: ASTNode;
  depth: number;
  label?: string;
  path: string;
  selectedPath: string | null;
}

const comparePosition = (left: AnalysisPosition, right: AnalysisPosition) =>
  left.line === right.line ? left.column - right.column : left.line - right.line;

const containsPosition = (node: ASTNode, position: AnalysisPosition) =>
  comparePosition(node.range.start, position) <= 0 &&
  comparePosition(position, node.range.end) <= 0;

const pathForPosition = (
  node: ASTNode,
  position: AnalysisPosition,
  path = "root",
): string | null => {
  if (!containsPosition(node, position)) return null;

  for (const [childIndex, child] of (node.children ?? []).entries()) {
    const childPath = pathForPosition(child.node, position, `${path}.${childIndex}`);
    if (childPath !== null) return childPath;
  }
  return path;
};

const ASTTreeNode = (props: ASTTreeNodeProps) => {
  const children = props.node.children ?? [];
  const [expandedOverride, setExpandedOverride] = useState<{
    expanded: boolean;
    selectedPath: string | null;
  } | null>(null);
  const isExpanded = expandedOverride?.selectedPath === props.selectedPath
    ? expandedOverride.expanded
    : true;
  const selected = props.selectedPath === props.path;
  const properties = Object.entries(props.node.properties ?? {}).sort(([left], [right]) =>
    left.localeCompare(right)
  );

  return (
    <div className="ast-tree__branch">
      <div
        className={`ast-tree__row${selected ? " ast-tree__row--selected" : ""}`}
        data-selected={selected ? "true" : undefined}
        style={{ paddingLeft: `${8 + props.depth * 14}px` }}
      >
        <button
          type="button"
          className="ast-tree__disclosure"
          aria-label={`${isExpanded ? "Collapse" : "Expand"} ${props.node.type}`}
          aria-expanded={children.length === 0 ? undefined : isExpanded}
          disabled={children.length === 0}
          onClick={() => setExpandedOverride({
            expanded: !isExpanded,
            selectedPath: props.selectedPath,
          })}
        >
          {children.length === 0 ? "·" : isExpanded ? "−" : "+"}
        </button>
        <button
          type="button"
          className="ast-tree__node"
          onClick={() => props.onSourcePositionSelect(props.node.range.start)}
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
  const treeRef = useRef<HTMLDivElement>(null);
  const selectedPath = useMemo(
    () => pathForPosition(props.root, props.sourcePosition),
    [props.root, props.sourcePosition],
  );

  useEffect(() => {
    treeRef.current?.querySelector<HTMLElement>('[data-selected="true"]')?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
    });
  }, [props.root, selectedPath]);

  return (
    <div
      ref={treeRef}
      className="analysis-visual ast-tree"
      role="tree"
      aria-label="Abstract syntax tree"
    >
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
