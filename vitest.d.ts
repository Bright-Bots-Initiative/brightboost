import "@testing-library/jest-dom";

interface CustomMatchers<R = unknown> {
  toBeInTheDocument: () => R;
  toHaveTextContent: (text: string) => R;
  toBeVisible: () => R;
  toBeChecked: () => R;
  toBeDisabled: () => R;
  toBeEnabled: () => R;
  toBeEmpty: () => R;
  toBeEmptyDOMElement: () => R;
  toBeInvalid: () => R;
  toBeRequired: () => R;
  toBeValid: () => R;
  toContainElement: (element: HTMLElement | null) => R;
  toContainHTML: (htmlText: string) => R;
  toHaveAttribute: (attr: string, value?: string) => R;
  toHaveClass: (...classNames: string[]) => R;
  toHaveFocus: () => R;
  toHaveFormValues: (expectedValues: Record<string, unknown>) => R;
  toHaveStyle: (css: string | Record<string, unknown>) => R;
  toHaveValue: (value?: string | string[] | number) => R;
}

declare module "vitest" {
  interface Assertion<T = unknown> extends CustomMatchers<T> {
    toBeDefined(): T;
  }
  interface AsymmetricMatchersContaining extends CustomMatchers {
    toBeDefined(): unknown;
  }
}
