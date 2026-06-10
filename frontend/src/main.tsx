import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Providers from "@/app/Providers";
import Dashboard from "@/app/Dashboard";
import "@/app/global.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element #root not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <Providers>
      <Dashboard />
    </Providers>
  </StrictMode>,
);
