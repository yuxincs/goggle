import GoggleIcon from "/goggle.svg?url";
import GitHubIcon from "@mui/icons-material/GitHub";
import CodeRoundedIcon from "@mui/icons-material/CodeRounded";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import { PROJECT_URL } from "../../constants.ts";

interface TitleProps {
  isReady: boolean;
  hasError: boolean;
  theme: "light" | "dark";
  onThemeToggle: () => void;
}

export const Title = ({ isReady, hasError, theme, onThemeToggle }: TitleProps) => {
  const status = !isReady ? "Starting engine" : hasError ? "Check source" : "Analysis ready";

  return (
    <header className="topbar">
      <a className="brand" href="./" aria-label="Goggle home">
        <span className="brand__mark">
          <img src={GoggleIcon} alt="" />
        </span>
        <span className="brand__copy">
          <span className="brand__name">Goggle</span>
          <span className="brand__tagline">Go compiler explorer</span>
        </span>
      </a>

      <div className="topbar__context" aria-hidden="true">
        <CodeRoundedIcon fontSize="small" />
        <span>Workspace</span>
        <span className="topbar__slash">/</span>
        <strong>Untitled.go</strong>
      </div>

      <div className="topbar__actions">
        <span className={`engine-status ${hasError ? "engine-status--error" : ""}`}>
          <span className="engine-status__dot" />
          {status}
        </span>
        <button
          className="theme-toggle"
          type="button"
          onClick={onThemeToggle}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? <LightModeRoundedIcon fontSize="small" /> : <DarkModeRoundedIcon fontSize="small" />}
        </button>
        <a className="github-link" href={PROJECT_URL} aria-label="View Goggle on GitHub">
          <GitHubIcon fontSize="small" />
          <span>GitHub</span>
        </a>
      </div>
    </header>
  );
};
