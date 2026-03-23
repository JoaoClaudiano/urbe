import { Component, type ReactNode } from "react";
import { MapFallback } from "./HexMap";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/** Catches any WebGL / deck.gl rendering errors that bubble up as React errors. */
export default class WebGLErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("WebGL rendering error:", error);
  }

  render() {
    if (this.state.hasError) {
      return <MapFallback />;
    }

    return this.props.children;
  }
}
