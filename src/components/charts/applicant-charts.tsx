"use client";
import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { BGApplication } from "@/types";
import { formatINR } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const COLORS = ["#22C55E", "#F59E0B", "#9CA3AF", "#3B82F6", "#8B5CF6"];
const STATUS_LABELS: Record<string, string> = {
  ISSUED: "Active",
  IN_PROGRESS: "In Progress",
  DRAFT: "Draft",
  PAY_FEES: "Pay Fees",
  OFFER_ACCEPTED: "Offer Accepted",
  EXPIRED: "Expired",
};

export function ApplicantPortfolioChart({ applications }: { applications: BGApplication[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <Card><CardHeader><CardTitle>Portfolio Health</CardTitle></CardHeader><CardContent className="h-[180px]" /></Card>;
  const statusGroups = applications.reduce<Record<string, number>>((acc, bg) => {
    acc[bg.status] = (acc[bg.status] || 0) + 1;
    return acc;
  }, {});

  const data = Object.entries(statusGroups).map(([status, count]) => ({
    name: STATUS_LABELS[status] || status,
    value: count,
  }));

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Portfolio Health</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative flex items-center justify-center" style={{ height: 180 }}>
          <PieChart width={180} height={180}>
            <Pie data={data} cx={90} cy={90} innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{total}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">Total BGs</span>
          </div>
        </div>
        <div className="space-y-2 mt-3">
          {data.map((d, i) => (
            <div key={d.name} className="flex items-center gap-2 text-sm">
              <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              <span className="text-gray-600 dark:text-gray-400 flex-1">{d.name}</span>
              <span className="font-semibold text-gray-900 dark:text-white">{d.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function ApplicantBeneficiaryChart({ applications }: { applications: BGApplication[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <Card><CardHeader><CardTitle>Top Beneficiaries (Exposure)</CardTitle></CardHeader><CardContent className="h-[200px]" /></Card>;
  const data = applications
    .filter((b) => b.status === "ISSUED" || b.status === "IN_PROGRESS" || b.status === "OFFER_ACCEPTED")
    .map((b) => ({
      name: b.beneficiary_name.length > 20 ? b.beneficiary_name.slice(0, 18) + "…" : b.beneficiary_name,
      amount: b.amount_inr / 100000,
    }))
    .sort((a, b) => b.amount - a.amount);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Beneficiaries (Exposure)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
            <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v}L`} axisLine={false} tickLine={false} className="text-gray-400" />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} axisLine={false} tickLine={false} className="text-gray-500 dark:text-gray-400" />
            <Tooltip
              formatter={(v: number) => [formatINR(v * 100000), "Exposure"]}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
            />
            <Bar dataKey="amount" radius={[0, 4, 4, 0]} fill="#0D1B3E" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
