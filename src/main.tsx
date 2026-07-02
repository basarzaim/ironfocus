import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { bootstrapPersistence } from "./lib/persistence/persistenceClient";
import { installGlobalErrorHandlers } from "./lib/errorReporting";

async function startApp() {
  installGlobalErrorHandlers();
  await bootstrapPersistence();

  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

void startApp();
