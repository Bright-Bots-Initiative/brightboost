import { Component, type ErrorInfo, type ReactNode } from "react";

interface BoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

export default class DemoErrorBoundary extends Component<
  BoundaryProps,
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Left in the console for whoever is debugging a failed chunk; nothing is
    // sent anywhere, and the visitor sees the fallback, not this.
    console.error("Public demo failed to load", error, info.componentStack);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
