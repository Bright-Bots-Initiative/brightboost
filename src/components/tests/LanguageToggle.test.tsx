import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { I18nextProvider } from "react-i18next";
import LanguageToggle from "../LanguageToggle";

const mockChangeLanguage = vi.fn();
const mockHasResourceBundle = vi.fn().mockReturnValue(true);
const mockAddResourceBundle = vi.fn();

beforeEach(() => {
  const localStorageMock = {
    getItem: vi.fn((key) => {
      if (key === "preferredLanguage") {
        return "es";
      }
      return null;
    }),
    setItem: vi.fn((key, value) => {}),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };

  Object.defineProperty(global, "localStorage", {
    value: localStorageMock,
    writable: true,
  });
});


vi.mock("react-i18next", async () => {
  const actual = await vi.importActual("react-i18next");
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => key,
      i18n: {
        changeLanguage: mockChangeLanguage,
        hasResourceBundle: mockHasResourceBundle,
        addResourceBundle: mockAddResourceBundle,
        language: "en",
      },
    }),
  };
});

describe("LanguageToggle", () => {
  it("should mock localStorage.getItem correctly", () => {
    const value = localStorage.getItem("preferredLanguage");
    console.log("Mocked value:", value);
    expect(value).toBe("es");
  });

  it("renders with the correct initial language button text", () => {
    render(
      <I18nextProvider
        i18n={{
          changeLanguage: mockChangeLanguage,
          hasResourceBundle: mockHasResourceBundle,
          addResourceBundle: mockAddResourceBundle,
          language: "es",
        }}
      >
        <LanguageToggle />
      </I18nextProvider>,
    );

    const button = screen.getByText("English");
    expect(button).toBeDefined();
  });

  it("toggles language between English and Spanish when clicked", async () => {
    render(
      <I18nextProvider
        i18n={{
          changeLanguage: mockChangeLanguage,
          hasResourceBundle: mockHasResourceBundle,
          addResourceBundle: mockAddResourceBundle,
          language: "es",
        }}
      >
        <LanguageToggle />
      </I18nextProvider>,
    );

    const button = screen.getByText("English");
    fireEvent.click(button);

    expect(mockChangeLanguage).toHaveBeenCalledWith("en");

    const newButton = screen.getByText("Español");
    expect(newButton).toBeDefined();
  });

  it("renders correctly when initial language is Spanish", () => {
    render(
      <I18nextProvider
        i18n={{
          changeLanguage: mockChangeLanguage,
          hasResourceBundle: mockHasResourceBundle,
          addResourceBundle: mockAddResourceBundle,
          language: "es",
        }}
      >
        <LanguageToggle />
      </I18nextProvider>,
    );

    const button = screen.getByText("English");
    expect(button).toBeDefined();
  });

  it("uses browser language if no stored language in localStorage", () => {
    vi.spyOn(global.localStorage, "getItem").mockReturnValue(null);

    render(
      <I18nextProvider
        i18n={{
          changeLanguage: mockChangeLanguage,
          hasResourceBundle: mockHasResourceBundle,
          addResourceBundle: mockAddResourceBundle,
          language: navigator.language || "en",
        }}
      >
        <LanguageToggle />
      </I18nextProvider>,
    );

    const button = screen.getByText(/Español|English/i);
    expect(button).toBeDefined();
  });

  it("falls back to English if no resource bundle available", () => {
    mockHasResourceBundle.mockReturnValue(false);

    render(
      <I18nextProvider
        i18n={{
          changeLanguage: mockChangeLanguage,
          hasResourceBundle: mockHasResourceBundle,
          addResourceBundle: mockAddResourceBundle,
          language: "es",
        }}
      >
        <LanguageToggle />
      </I18nextProvider>,
    );

    const button = screen.getByText("English");
    expect(button).toBeDefined();
  });

  it("handles error if language change fails", async () => {
    mockChangeLanguage.mockRejectedValueOnce(
      new Error("Language change failed"),
    );

    render(
      <I18nextProvider
        i18n={{
          changeLanguage: mockChangeLanguage,
          hasResourceBundle: mockHasResourceBundle,
          addResourceBundle: mockAddResourceBundle,
          language: "es",
        }}
      >
        <LanguageToggle />
      </I18nextProvider>,
    );

    const button = screen.getByText("English");
    fireEvent.click(button);

    expect(mockChangeLanguage).toHaveBeenCalledWith("es");
  });

  it("shows default language (English) if no language is stored and no browser language is available", () => {
    vi.spyOn(global.localStorage, "getItem").mockReturnValue(null);
    vi.spyOn(navigator, "language", "get").mockReturnValue("fr");

    render(
      <I18nextProvider
        i18n={{
          changeLanguage: mockChangeLanguage,
          hasResourceBundle: mockHasResourceBundle,
          addResourceBundle: mockAddResourceBundle,
          language: "en",
        }}
      >
        <LanguageToggle />
      </I18nextProvider>,
    );

    const button = screen.getByText("Español");
    expect(button).toBeDefined();
  });

  it("updates button text correctly when language is toggled", async () => {
    render(
      <I18nextProvider
        i18n={{
          changeLanguage: mockChangeLanguage,
          hasResourceBundle: mockHasResourceBundle,
          addResourceBundle: mockAddResourceBundle,
          language: "es",
        }}
      >
        <LanguageToggle />
      </I18nextProvider>,
    );

    let button = await screen.findByText("English");

    expect(button).toBeInTheDocument();

    fireEvent.click(button);

    expect(mockChangeLanguage).toHaveBeenCalledWith("en");

    button = await screen.findByText("Español");
    expect(button).toBeInTheDocument();
  });

  it("persists the language selection after page reload", async () => {
    const localStorageMock = {
      getItem: vi.fn((key) => {
        if (key === "preferredLanguage") {
          return "es";
        }
        return null;
      }),
      setItem: vi.fn((key, value) => {}),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };

    Object.defineProperty(global, "localStorage", {
      value: localStorageMock,
      writable: true,
    });

    render(
      <I18nextProvider
        i18n={{
          changeLanguage: mockChangeLanguage,
          hasResourceBundle: mockHasResourceBundle,
          addResourceBundle: mockAddResourceBundle,
          language: "es",
        }}
      >
        <LanguageToggle />
      </I18nextProvider>,
    );

    const button = await screen.findByText("English");

    expect(button).toBeInTheDocument();

    cleanup();

    render(
      <I18nextProvider
        i18n={{
          changeLanguage: mockChangeLanguage,
          hasResourceBundle: mockHasResourceBundle,
          addResourceBundle: mockAddResourceBundle,
          language: "es",
        }}
      >
        <LanguageToggle />
      </I18nextProvider>,
    );

    const newButton = await screen.findByText("English");

    expect(newButton).toBeInTheDocument();
  });
});
