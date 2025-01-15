import { styled } from "@mui/material";

export const TitleButton = styled("button")({
  display: "flex",
  gap: "12px",
  alignItems: "center",
  height: "100%",
  background: "transparent",
  fontFamily: "Inter",
  fontSize: "14px",
  border: "none",
  transition: "border 0.3s cubic-bezier(.2,0,0,1) 0s",
  borderBottom: "2px solid transparent",
  ":hover:enabled": {
    cursor: "pointer",
    borderBottom: "2px solid #1677ff",
  },
  ":hover:disabled": {
    cursor: "not-allowed",
  },
});
