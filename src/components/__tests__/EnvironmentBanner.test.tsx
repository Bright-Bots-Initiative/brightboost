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
  declared: true,
  isProduction: false,
  gitSha: "91e4071f0017fa508bb9cf385abc066ede6b07e1",
  showBanner: true,
};

describe("EnvironmentBanner", () => {
  it("renders on staging with the environment label and short SHA", () => {
    render(<EnvironmentBanner env={base} />);
    const banner = screen.getByTestId("environment-banner");
    expect(banner).toHaveAttribute("role", "status");
    expect(banner).toHaveAttribute("data-env", "staging");
    expect(banner).toHaveTextContent("envBanner.message:envBanner.env.staging");
    expect(banner).toHaveTextContent("envBanner.build:91e4071");
  });

  it("omits the build label when no SHA is known", () => {
    render(<EnvironmentBanner env={{ ...base, gitSha: null }} />);
    expect(screen.getByTestId("environment-banner")).not.toHaveTextContent(
      "envBanner.build",
    );
  });

  it("renders nothing in production", () => {
    render(
      <EnvironmentBanner
        env={{
          ...base,
          name: "production",
          isProduction: true,
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
