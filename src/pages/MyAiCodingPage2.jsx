import React from "react";
import { AiCodingPageBuilderWorkspace } from "./AiCodingPageBuilder";

export default function MyAiCodingPage2() {
  return (
    <AiCodingPageBuilderWorkspace
      mineOnly
      pageTitle="My AI Coding 2"
      roleMenuOnly
      noDirectModelSelection
      advancedDropdownBuilder
      appendModelsOnPageSelect
      enableRefinement
    />
  );
}
