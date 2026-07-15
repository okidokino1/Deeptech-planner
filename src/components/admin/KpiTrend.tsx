"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export function KpiTrend({ data }: { data: { date: string; signups: number; revenue: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
        <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }}
          formatter={(v: number, n: string) => (n === "매출" ? [`${v.toLocaleString()}원`, n] : [v, n])}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
        <Bar yAxisId="left" dataKey="signups" name="가입" fill="#a5b4fc" radius={[4, 4, 0, 0]} />
        <Line yAxisId="right" type="monotone" dataKey="revenue" name="매출" stroke="#4f46e5" strokeWidth={2} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
