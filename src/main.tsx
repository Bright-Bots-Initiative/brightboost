import "./index.css";
import { bootstrap } from "./bootstrap";
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
