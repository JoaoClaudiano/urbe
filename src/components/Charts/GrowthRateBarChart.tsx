import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useRegion } from "../../context/RegionContext";
import processedData from "../../data/processed.json";

export default function GrowthRateBarChart() {
  const { selectedRegion } = useRegion();

  const data = processedData.regions.map((r) => ({
    name: r.name.length > 10 ? r.name.substring(0, 10) + "…" : r.name,
    fullName: r.name,
    growthRate: r.growthRate,
    selected: selectedRegion?.name === r.name,
  }));

  return (
    <div>
      <h3 style={{ marginBottom: "10px", color: "#e94560", fontSize: "13px" }}>
        Taxa de crescimento (%) por bairro
      </h3>
      <ResponsiveContainer width="100%" height={130}>
        <BarChart data={data} margin={{ top: 0, right: 10, bottom: 20, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis
            dataKey="name"
            stroke="#888"
            tick={{ fontSize: 9 }}
            angle={-30}
            textAnchor="end"
          />
          <YAxis stroke="#888" tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              background: "#1a1a2e",
              border: "1px solid #333",
              color: "#fff",
            }}
            formatter={(
              value: number,
              _name: string,
              props: { payload?: { fullName?: string } }
            ) => [
              `${value.toFixed(2)}%`,
              props.payload?.fullName ?? "Taxa de crescimento",
            ]}
          />
          <Bar dataKey="growthRate" animationDuration={500}>
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.selected ? "#e94560" : "#533483"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
