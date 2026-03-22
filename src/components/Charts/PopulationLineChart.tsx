import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useRegion } from "../../context/RegionContext";

export default function PopulationLineChart() {
  const { selectedRegion } = useRegion();

  if (!selectedRegion) {
    return (
      <div style={{ color: "#666", textAlign: "center", padding: "20px" }}>
        Clique em uma região no mapa
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ marginBottom: "10px", color: "#e94560", fontSize: "13px" }}>
        População ao longo do tempo
      </h3>
      <ResponsiveContainer width="100%" height={130}>
        <LineChart data={selectedRegion.populationHistory}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis dataKey="year" stroke="#888" tick={{ fontSize: 11 }} />
          <YAxis
            stroke="#888"
            tick={{ fontSize: 11 }}
            tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            contentStyle={{
              background: "#1a1a2e",
              border: "1px solid #333",
              color: "#fff",
            }}
            formatter={(value: number) => [
              value.toLocaleString("pt-BR"),
              "População",
            ]}
          />
          <Line
            type="monotone"
            dataKey="population"
            stroke="#e94560"
            strokeWidth={2}
            dot={{ fill: "#e94560", r: 3 }}
            activeDot={{ r: 5 }}
            animationDuration={500}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
