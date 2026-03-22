import HexMap from "./components/Map/HexMap";
import Sidebar from "./components/Sidebar";
import { RegionProvider } from "./context/RegionContext";

export default function App() {
  return (
    <RegionProvider>
      <div style={{ display: "flex", width: "100vw", height: "100vh" }}>
        <Sidebar />
        <div style={{ flex: 1, position: "relative" }}>
          <HexMap />
        </div>
      </div>
    </RegionProvider>
  );
}
