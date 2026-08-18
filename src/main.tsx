import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { initAnalytics } from "./lib/analytics";
import {
  GREAT_WORK_ENGINE_STUB_ID,
  describeGreatWorkEngine,
} from "@shared/greatwork-engine";

// Keep the shared stub in the production bundle (W-01 / #730).
// Assign to a live DOM property so Rollup cannot DCE the import.
const rootEl = document.getElementById("root");
if (rootEl) {
  rootEl.dataset.greatWorkEngine = describeGreatWorkEngine({
    id: GREAT_WORK_ENGINE_STUB_ID,
    version: "0.0.0",
  });
}

initAnalytics();

const renderApp = () => {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
};

import("./i18n").then(() => renderApp());
