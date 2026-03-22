import { useRegion } from "../context/RegionContext";
import { PopulationLineChart, GrowthRateBarChart, AgePyramid } from "./Charts";

const LEGEND_STEPS = [
  { color: "#1a1a2e", label: "< 5.000" },
  { color: "#16213e", label: "5.000" },
  { color: "#0f3460", label: "7.000" },
  { color: "#533483", label: "9.000" },
  { color: "#e94560", label: "11.000" },
  { color: "#ff6b6b", label: "> 12.000" },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { selectedRegion } = useRegion();

  return (
    <aside
      className={`sidebar${open ? "" : " sidebar--hidden"}`}
      style={{
        width: "320px",
        minWidth: "320px",
        height: "100vh",
        background: "#0d0d1a",
        borderRight: "1px solid #1e1e3a",
        overflowY: "auto",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        zIndex: 10,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1
            style={{
              fontSize: "22px",
              color: "#e94560",
              fontWeight: "bold",
              letterSpacing: "2px",
            }}
          >
            URBE
          </h1>
          <p style={{ fontSize: "12px", color: "#888", marginTop: "2px" }}>
            Região Metropolitana de Fortaleza
          </p>
        </div>
        {/* Close button — only visible on mobile via CSS */}
        <button
          className="sidebar-toggle"
          onClick={onClose}
          style={{
            display: "none",
            background: "transparent",
            border: "none",
            color: "#888",
            cursor: "pointer",
            fontSize: "20px",
            lineHeight: 1,
            padding: "4px",
          }}
          aria-label="Fechar menu"
        >
          ✕
        </button>
      </div>

      <div
        style={{
          background: "#13132a",
          border: "1px solid #1e1e3a",
          borderRadius: "8px",
          padding: "12px",
        }}
      >
        <h2
          style={{
            fontSize: "13px",
            color: "#888",
            marginBottom: "8px",
            textTransform: "uppercase",
            letterSpacing: "1px",
          }}
        >
          Região selecionada
        </h2>
        {selectedRegion ? (
          <div>
            <p
              style={{
                fontSize: "18px",
                fontWeight: "bold",
                color: "#fff",
                marginBottom: "8px",
              }}
            >
              {selectedRegion.name}
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "8px",
              }}
            >
              <Stat
                label="Densidade"
                value={`${selectedRegion.density.toLocaleString("pt-BR")} hab/km²`}
              />
              <Stat
                label="População"
                value={selectedRegion.population.toLocaleString("pt-BR")}
              />
              <Stat label="Área" value={`${selectedRegion.area} km²`} />
              <Stat
                label="Crescimento"
                value={`${selectedRegion.growthRate}% a.a.`}
              />
            </div>
          </div>
        ) : (
          <p style={{ color: "#555", fontSize: "13px" }}>
            Clique em um hexágono no mapa para ver detalhes
          </p>
        )}
      </div>

      <div>
        <h2
          style={{
            fontSize: "13px",
            color: "#888",
            marginBottom: "8px",
            textTransform: "uppercase",
            letterSpacing: "1px",
          }}
        >
          Densidade (hab/km²)
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {LEGEND_STEPS.map((step) => (
            <div
              key={step.label}
              style={{ display: "flex", alignItems: "center", gap: "8px" }}
            >
              <div
                style={{
                  width: "16px",
                  height: "16px",
                  borderRadius: "3px",
                  background: step.color,
                  border: "1px solid rgba(255,255,255,0.15)",
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: "11px", color: "#aaa" }}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <PopulationLineChart />
        <GrowthRateBarChart />
        {selectedRegion && <AgePyramid />}
      </div>
    </aside>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p
        style={{
          fontSize: "10px",
          color: "#666",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}
      >
        {label}
      </p>
      <p style={{ fontSize: "13px", color: "#ccc", fontWeight: "500" }}>
        {value}
      </p>
    </div>
  );
}
