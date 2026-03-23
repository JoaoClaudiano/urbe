import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/** Catches any unexpected map rendering errors that bubble up as React errors. */
export default class WebGLErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("Map rendering error:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#0d0d1a",
            color: "#ccc",
            flexDirection: "column",
            gap: "12px",
            padding: "24px",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: "1rem", margin: 0 }}>
            Não foi possível renderizar o mapa.
          </p>
          <p style={{ fontSize: "0.85rem", color: "#666", margin: 0 }}>
            Tente recarregar a página.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
