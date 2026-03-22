import { useState } from "react";
import HexMap from "./components/Map/HexMap";
import Sidebar from "./components/Sidebar";
import { RegionProvider } from "./context/RegionContext";

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <RegionProvider>
      <div style={{ display: "flex", width: "100vw", height: "100vh" }}>
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div style={{ flex: 1, position: "relative", height: "100%" }}>
          {/* Toggle button — only visible on mobile via CSS */}
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen((o) => !o)}
            style={{
              display: "none",
              position: "absolute",
              top: "12px",
              left: "12px",
              zIndex: 300,
              background: "#0d0d1a",
              border: "1px solid #1e1e3a",
              borderRadius: "8px",
              color: "#fff",
              padding: "8px 12px",
              cursor: "pointer",
              fontSize: "20px",
              lineHeight: 1,
            }}
            aria-label="Abrir menu"
          >
            ☰
          </button>
          <HexMap />
        </div>
      </div>
    </RegionProvider>
  );
}
