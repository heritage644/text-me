import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.tsx";
import { env } from "./lib/env";

async function bootstrap() {
  // Mock mode swaps the HTTP and socket transports before anything renders.
  if (env.useMocks) {
    const { enableMocks } = await import("./api/mocks");
    enableMocks();
  }

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  );
}

void bootstrap();
