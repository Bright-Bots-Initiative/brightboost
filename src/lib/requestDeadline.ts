/** Abort the network request and settle the caller even if an adapter ignores abort. */
export function withRequestDeadline<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  parentSignal?: AbortSignal,
  timeoutMs = 10_000,
): Promise<T> {
  const controller = new AbortController();
  const abortFromParent = () => controller.abort(parentSignal?.reason);
  if (parentSignal?.aborted) abortFromParent();
  else parentSignal?.addEventListener("abort", abortFromParent, { once: true });
  let rejectAborted!: () => void;
  const timer = setTimeout(
    () =>
      controller.abort(new DOMException("Request timed out", "TimeoutError")),
    timeoutMs,
  );
  const aborted = new Promise<never>((_, reject) => {
    rejectAborted = () => reject(controller.signal.reason);
    if (controller.signal.aborted) rejectAborted();
    else
      controller.signal.addEventListener("abort", rejectAborted, {
        once: true,
      });
  });
  const request = Promise.resolve().then(() => {
    controller.signal.throwIfAborted();
    return operation(controller.signal);
  });
  return Promise.race([request, aborted]).finally(() => {
    clearTimeout(timer);
    parentSignal?.removeEventListener("abort", abortFromParent);
    controller.signal.removeEventListener("abort", rejectAborted);
  });
}
