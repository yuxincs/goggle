import { IconButton, Stack, styled } from "@mui/material";

import GoggleIcon from "/goggle.svg?url";
import GitHubIcon from "@mui/icons-material/GitHub";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import IosShareIcon from "@mui/icons-material/IosShare";
import { TitleButton } from "./TitleButton.tsx";
import { PROJECT_URL } from "../constants.ts";

const StyledTitle = styled(Stack)({
  alignItems: "center",
  height: "100%",
  zIndex: 1000,
  lineHeight: "100%",
  paddingInlineStart: "40px",
  paddingRight: "40px",
  boxShadow:
    "0 1px 2px 0 rgba(0, 0, 0, 0.03),0 1px 6px -1px rgba(0, 0, 0, 0.02),0 2px 4px 0 rgba(0, 0, 0, 0.02)",
});

const StyledLogo = styled("span")({
  display: "flex",
  alignItems: "center",
  gap: "16px",
  fontFamily: "JetBrains Mono",
  fontSize: "28px",
  fontWeight: "800",
  userSelect: "none",
});

export const Title = () => {
  return (
    <StyledTitle direction="row" spacing={4}>
      <StyledLogo>
        <img src={GoggleIcon} alt="Goggle Icon" />
        <span>(Go)ggle</span>
      </StyledLogo>

      <TitleButton disabled={true}>
        <UploadFileIcon />
        <span>Load Packages</span>
      </TitleButton>
      <TitleButton disabled={true}>
        <IosShareIcon />
        <span>Export</span>
      </TitleButton>

      {/* The invisible divider that pushes the components below to the right */}
      <span style={{ marginLeft: "auto" }} />

      <IconButton size="large" onClick={() => (location.href = PROJECT_URL)}>
        <GitHubIcon sx={{ color: "black" }} />
      </IconButton>
    </StyledTitle>
  );
};
