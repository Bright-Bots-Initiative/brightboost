import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import EnvironmentBanner from "../EnvironmentBanner";
import type { ClientDeployEnv } from "@/lib/deployEnv";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts ? `${key}:${Object.values(opts).join(",")}` : key,
  }),
}));

const base: ClientDeployEnv = {
  name: "staging",
  isProduction: false,
  noindex: true,
  source: "railway",
  railwayEnv: "staging",
  railwayEnvironmentName: "staging",
  declaredEnv: "staging",
  declared: true,
  mismatch: "none",
  configError: null,
  gitSha: "91e4071f0017fa508bb9cf385abc066ede6b07e1",
  showBanner: true,
};

describe("EnvironmentBanner", () => {
  it("renders on staging with the environment label and short SHA", () => {
    render(<EnvironmentBanner env={base} />);
    const banner = screen.getByTestId("environment-banner");
    expect(banner).toHaveAttribute("role", "status");
    expect(banner).toHaveAttribute("data-env", "staging");
    expect(banner).toHaveAttribute("data-mismatch", "none");
    expect(banner).toHaveTextContent("envBanner.message:envBanner.env.staging");
    expect(banner).toHaveTextContent("envBanner.build:91e4071");
  });

  it("omits the build label when no SHA is known", () => {
    render(<EnvironmentBanner env={{ ...base, gitSha: null }} />);
    expect(screen.getByTestId("environment-banner")).not.toHaveTextContent(
      "envBanner.build",
    );
  });

  it("SABOTAGE: a declaration/Railway mismatch renders the mismatch banner (never silent)", () => {
    render(
      <EnvironmentBanner
        env={{
          ...base,
          name: "preview",
          declaredEnv: "production",
          mismatch: "declared-vs-railway",
          configError:
            "VITE_APP_ENV=production disagrees with VITE_RAILWAY_ENVIRONMENT_NAME (classified staging).",
        }}
      />,
    );
    const banner = screen.getByTestId("environment-banner");
    expect(banner).toHaveAttribute("data-env", "preview");
    expect(banner).toHaveAttribute("data-mismatch", "declared-vs-railway");
    expect(banner).toHaveTextContent(
      "envBanner.mismatch:envBanner.env.preview",
    );
  });

  it("renders nothing in production", () => {
    render(
      <EnvironmentBanner
        env={{
          ...base,
          name: "production",
          isProduction: true,
          noindex: false,
          railwayEnv: "production",
          declaredEnv: "production",
          showBanner: false,
        }}
      />,
    );
    expect(screen.queryByTestId("environment-banner")).toBeNull();
  });

  it("renders nothing in the unit-test environment by default (no override)", () => {
    render(<EnvironmentBanner />);
    expect(screen.queryByTestId("environment-banner")).toBeNull();
  });
});
