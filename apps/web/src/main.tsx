import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "@cham-lang/ui/styles";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
