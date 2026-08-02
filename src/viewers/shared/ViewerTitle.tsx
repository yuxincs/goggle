import { styled } from "@mui/material";
import "@fontsource/jetbrains-mono/600.css";

export const ViewerTitle = styled("div")({
  fontFamily: "JetBrains Mono",
  fontWeight: "600",
  padding: "0 16px",
  userSelect: "none",
  height: "100%",
  display: "flex",
  alignItems: "center",
  gap: "9px",
  color: "var(--panel-title-text)",
  fontSize: "11px",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  background: "var(--panel-title-bg)",
  borderBottom: "1px solid var(--panel-title-border)",
  "&::before": {
    content: '""',
    width: "7px",
    height: "7px",
    borderRadius: "2px",
    background: "#66d9a8",
  },
});
