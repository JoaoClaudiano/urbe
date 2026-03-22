import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useRegion } from "../../context/RegionContext";

export default function AgePyramid() {
  const { selectedRegion } = useRegion();

  if (!selectedRegion) {
    return null;
  }

  const data = selectedRegion.ageGroups.map((g) => ({
    age: g.age,
    male: -g.male,
    female: g.female,
  }));

  return (
    <div>
      <h3 style={{ marginBottom: "10px", color: "#e94560", fontSize: "13px" }}>
        Pirâmide etária — {selectedRegion.name}
      </h3>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 10, bottom: 0, left: 20 }}
          barCategoryGap="20%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
          <XAxis
            type="number"
            stroke="#888"
            tick={{ fontSize: 10 }}
            tickFormatter={(v: number) => `${Math.abs(v / 1000).toFixed(0)}k`}
          />
          <YAxis
            dataKey="age"
            type="category"
            stroke="#888"
            tick={{ fontSize: 10 }}
            width={40}
          />
          <Tooltip
            contentStyle={{
              background: "#1a1a2e",
              border: "1px solid #333",
              color: "#fff",
            }}
            formatter={(value: number, name: string) => [
              Math.abs(value).toLocaleString("pt-BR"),
              name === "male" ? "Homens" : "Mulheres",
            ]}
          />
          <Legend
            formatter={(value: string) =>
              value === "male" ? "Homens" : "Mulheres"
            }
            wrapperStyle={{ fontSize: "11px" }}
          />
          <Bar dataKey="male" fill="#0f3460" animationDuration={500} />
          <Bar dataKey="female" fill="#e94560" animationDuration={500} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
