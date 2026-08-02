export type AnalysisViewMode = "visual" | "text";

interface ViewModeToggleProps {
  label: string;
  mode: AnalysisViewMode;
  onChange: (mode: AnalysisViewMode) => void;
}

export const ViewModeToggle = (props: ViewModeToggleProps) => (
  <div className="view-mode-toggle" role="group" aria-label={`${props.label} view mode`}>
    {(["visual", "text"] as const).map((mode) => (
      <button
        key={mode}
        type="button"
        className="view-mode-toggle__button"
        aria-pressed={props.mode === mode}
        onClick={() => props.onChange(mode)}
      >
        {mode === "visual" ? "Visual" : "Text"}
      </button>
    ))}
  </div>
);
