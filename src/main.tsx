import "./index.css";
import { bootstrap } from "./bootstrap";

const rootEl = document.getElementById("root");

if (rootEl) {
  bootstrap(rootEl, async () => {
    await import("./i18n");
    const [{ default: App }, { initAnalytics }] = await Promise.all([
      import("./App"),
      import("./lib/analytics"),
    ]);
    initAnalytics();
    return App;
  });
}
