export type AnalysisViewMode = "tree" | "blocks" | "graph" | "text";

interface ViewModeToggleProps {
  label: string;
  mode: AnalysisViewMode;
  modes: readonly AnalysisViewMode[];
  onChange: (mode: AnalysisViewMode) => void;
}

const modeLabels: Record<AnalysisViewMode, string> = {
  tree: "Tree",
  blocks: "Blocks",
  graph: "Graph",
  text: "Text",
};

export const ViewModeToggle = (props: ViewModeToggleProps) => (
  <div className="view-mode-toggle" role="group" aria-label={`${props.label} view mode`}>
    {props.modes.map((mode) => (
      <button
        key={mode}
        type="button"
        className="view-mode-toggle__button"
        aria-pressed={props.mode === mode}
        onClick={() => props.onChange(mode)}
      >
        {modeLabels[mode]}
      </button>
    ))}
  </div>
);
