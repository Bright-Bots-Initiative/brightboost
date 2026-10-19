import { StrictMode, type ComponentType } from "react";
import { createRoot } from "react-dom/client";
import RecoveryScreen, {
  AppErrorBoundary,
  LoadingScreen,
} from "@/components/RecoveryScreen";

export function bootstrap(
  element: HTMLElement,
  loadApplication: () => Promise<ComponentType>,
) {
  const root = createRoot(element);
  let failed = false;
  let disposed = false;
  const recover = () => {
    if (disposed) return;
    failed = true;
    root.render(<RecoveryScreen />);
  };
  // A stale tab may request an asset removed by a deploy. Only an explicit
  // user action reloads, so persistent outages cannot create reload loops.
  const onPreloadError = (event: Event) => {
    event.preventDefault();
    recover();
  };
  window.addEventListener("vite:preloadError", onPreloadError);
  root.render(<LoadingScreen />);
  const timeout = setTimeout(recover, 20_000);
  void Promise.resolve()
    .then(loadApplication)
    .then((App) => {
      if (!failed && !disposed) {
        root.render(
          <StrictMode>
            <AppErrorBoundary>
              <App />
            </AppErrorBoundary>
          </StrictMode>,
        );
      }
    })
    .catch(recover)
    .finally(() => clearTimeout(timeout));
  return () => {
    disposed = true;
    clearTimeout(timeout);
    window.removeEventListener("vite:preloadError", onPreloadError);
    root.unmount();
  };
}
