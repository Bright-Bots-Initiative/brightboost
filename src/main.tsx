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
    // Keep an unavailable third-party font out of the required app CSS preload.
    const font = document.createElement("link");
    font.rel = "stylesheet";
    font.href =
      "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap";
    document.head.append(font);
    initAnalytics();
    return App;
  });
}
