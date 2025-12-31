import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

const renderApp = () => {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
};

if (import.meta.env.VITE_ENABLE_I18N === "true") {
  import("./i18n").then(() => renderApp());
} else {
  renderApp();
}
