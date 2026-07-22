export type EnvGetter = (name: string) => unknown;

function missingEnvMessage(name: string): string {
  return (
    `[brightboost-e2e] Required env "${name}" is not set. ` +
    `This spec asserts against a deployed environment and cannot run without it. ` +
    `Set ${name} (see docs/ci.md §Staging). Refusing to pass silently — see issue #677.`
  );
}

export function requireEnv(name: string, get: EnvGetter): string {
  const raw = get(name);
  if (raw === undefined || raw === null || String(raw).trim() === "") {
    throw new Error(missingEnvMessage(name));
  }
  return String(raw).trim();
}
